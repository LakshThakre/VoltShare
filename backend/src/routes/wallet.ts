import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ============================================================================
// 1. GET USER WALLET (Protected: strictly scoped to req.user.id)
// ============================================================================
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    let walletRes = await query(
      'SELECT id, balance, energy_balance_kwh FROM public.wallets WHERE user_id = $1',
      [userId]
    );

    // If wallet doesn't exist yet, initialize it
    if (walletRes.rows.length === 0) {
      walletRes = await query(
        `INSERT INTO public.wallets (id, user_id, balance, energy_balance_kwh, created_at)
         VALUES (gen_random_uuid(), $1, 0.00, 0.00, now())
         RETURNING id, balance, energy_balance_kwh`,
        [userId]
      );
    }

    return res.json(walletRes.rows[0]);
  } catch (err: any) {
    console.error('Fetch wallet error:', err);
    return res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// ============================================================================
// 2. ADD FUNDS (Protected: uses atomic stored procedure add_money)
// ============================================================================
router.post('/add-funds', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive amount.' });
    }

    // Call stored procedure add_money
    await query('SELECT public.add_money($1, $2)', [userId, Number(amount)]);

    // Fetch updated balance
    const updated = await query('SELECT balance FROM public.wallets WHERE user_id = $1', [userId]);

    return res.json({
      success: true,
      balance: Number(updated.rows[0]?.balance || 0),
      message: `Successfully added ₹${amount} via UPI.`,
    });
  } catch (err: any) {
    console.error('Add funds error:', err);
    return res.status(500).json({ error: 'Failed to add funds' });
  }
});

// ============================================================================
// 3. WITHDRAW FUNDS (Protected: uses atomic stored procedure withdraw_money)
// ============================================================================
router.post('/withdraw', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, destination } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive withdrawal amount.' });
    }

    const resDb = await query('SELECT public.withdraw_money($1, $2) as status', [userId, Number(amount)]);
    const status = resDb.rows[0]?.status;

    if (status && status.startsWith('Error:')) {
      return res.status(400).json({ error: status.replace('Error: ', '') });
    }

    const updated = await query('SELECT balance FROM public.wallets WHERE user_id = $1', [userId]);

    return res.json({
      success: true,
      balance: Number(updated.rows[0]?.balance || 0),
      message: `Successfully withdrawn ₹${amount} to ${destination || 'Bank Account'}.`,
    });
  } catch (err: any) {
    console.error('Withdraw funds error:', err);
    return res.status(500).json({ error: 'Failed to withdraw funds' });
  }
});

// ============================================================================
// 4. GET TRANSACTIONS (Protected: filtered strictly by req.user.id)
// ============================================================================
router.get('/transactions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Fetch user's wallet ID
    const wRes = await query('SELECT id FROM public.wallets WHERE user_id = $1', [userId]);
    const walletId = wRes.rows[0]?.id;

    // 2. Fetch wallet ledger transactions
    let walletTxs: any[] = [];
    if (walletId) {
      const wtRes = await query(
        `SELECT id, type, title, amount, balance_after, created_at
         FROM public.wallet_transactions
         WHERE wallet_id = $1
         ORDER BY created_at DESC LIMIT 20`,
        [walletId]
      );
      walletTxs = wtRes.rows;
    }

    // 3. Fetch trade transactions
    const txRes = await query(
      `SELECT t.*, 
              bp.full_name as buyer_name, 
              sp.full_name as seller_name
       FROM public.transactions t
       LEFT JOIN public.profiles bp ON t.buyer_id = bp.id
       LEFT JOIN public.profiles sp ON t.seller_id = sp.id
       WHERE t.buyer_id = $1 OR t.seller_id = $1
       ORDER BY t.created_at DESC LIMIT 20`,
      [userId]
    );

    return res.json({
      walletTransactions: walletTxs,
      tradeTransactions: txRes.rows,
    });
  } catch (err: any) {
    console.error('Fetch transactions error:', err);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ============================================================================
// 5. GET LATEST NOTIFICATION (Protected: filtered by req.user.id)
// ============================================================================
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifRes = await query(
      'SELECT message, is_read, created_at FROM public.notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    return res.json(notifRes.rows[0] || null);
  } catch (err: any) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

export default router;

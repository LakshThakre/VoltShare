import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ============================================================================
// 1. GET ALL ACTIVE LISTINGS
// ============================================================================
router.get('/listings', async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT l.*, 
              json_build_object('full_name', p.full_name, 'avatar_url', p.avatar_url) as profiles
       FROM public.energy_listings l
       JOIN public.profiles p ON l.seller_id = p.id
       WHERE l.is_active = true AND l.available_kwh > 0.05
       ORDER BY l.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err: any) {
    console.error('Fetch listings error:', err);
    return res.status(500).json({ error: 'Failed to fetch marketplace listings' });
  }
});

// ============================================================================
// 2. PUBLISH OR UPDATE LISTING (Protected: scoped to req.user.id)
// ============================================================================
router.post('/listings', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { availableKwh, pricePerKwh, locationLabel } = req.body;

    if (!availableKwh || Number(availableKwh) <= 0) {
      return res.status(400).json({ error: 'Please enter a valid surplus amount greater than 0 kWh.' });
    }
    if (!pricePerKwh || Number(pricePerKwh) <= 0) {
      return res.status(400).json({ error: 'Please enter a valid price per kWh.' });
    }

    // Verify seller has sufficient energy in wallet
    const walletRes = await query(
      'SELECT energy_balance_kwh FROM public.wallets WHERE user_id = $1',
      [userId]
    );
    const sellerEnergy = Number(walletRes.rows[0]?.energy_balance_kwh || 0);
    if (Number(availableKwh) > sellerEnergy) {
      return res.status(400).json({
        error: `Cannot list ${availableKwh} kWh. Seller only has ${sellerEnergy.toFixed(1)} kWh available.`,
      });
    }

    // Check for existing listing by this seller
    const existing = await query(
      'SELECT id FROM public.energy_listings WHERE seller_id = $1 LIMIT 1',
      [userId]
    );

    let listingId = existing.rows[0]?.id;
    if (listingId) {
      await query(
        `UPDATE public.energy_listings
         SET price_per_kwh = $1, available_kwh = $2, total_surplus_kwh = $3,
             location_label = $4, is_active = true
         WHERE id = $5`,
        [
          Number(pricePerKwh),
          Number(availableKwh),
          sellerEnergy,
          locationLabel || 'Local Microgrid',
          listingId,
        ]
      );
    } else {
      const inserted = await query(
        `INSERT INTO public.energy_listings (
           id, seller_id, price_per_kwh, available_kwh, total_surplus_kwh,
           location_label, distance_km, is_active, created_at
         ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 0.5, true, now())
         RETURNING id`,
        [
          userId,
          Number(pricePerKwh),
          Number(availableKwh),
          sellerEnergy,
          locationLabel || 'Local Microgrid',
        ]
      );
      listingId = inserted.rows[0].id;
    }

    return res.json({ success: true, listingId, message: 'Listing published successfully!' });
  } catch (err: any) {
    console.error('Publish listing error:', err);
    return res.status(500).json({ error: err.message || 'Failed to publish listing' });
  }
});

// ============================================================================
// 3. UPDATE SELLER RATE (Protected: scoped to req.user.id)
// ============================================================================
router.put('/rate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { rate } = req.body;
    if (!rate || Number(rate) <= 0) {
      return res.status(400).json({ error: 'Valid price rate required' });
    }

    await query(
      'UPDATE public.energy_listings SET price_per_kwh = $1 WHERE seller_id = $2',
      [Number(rate), userId]
    );

    return res.json({ success: true, rate: Number(rate) });
  } catch (err: any) {
    console.error('Update rate error:', err);
    return res.status(500).json({ error: 'Failed to update rate' });
  }
});

// ============================================================================
// 4. BUY ENERGY (Protected: uses atomic stored procedure buy_energy)
// ============================================================================
router.post('/buy', requireAuth, async (req: Request, res: Response) => {
  try {
    const buyerId = req.user!.id;
    const { listingId, kwh } = req.body;

    if (!listingId || !kwh || Number(kwh) <= 0) {
      return res.status(400).json({ error: 'Valid listingId and kwh required' });
    }

    // Call native PostgreSQL buy_energy stored procedure
    const result = await query(
      'SELECT public.buy_energy($1, $2, $3) as status',
      [buyerId, listingId, Number(kwh)]
    );

    const status = result.rows[0]?.status;
    if (status && status.startsWith('Error:')) {
      return res.status(400).json({ error: status.replace('Error: ', '') });
    }

    return res.json({ success: true, message: 'Energy purchased successfully!' });
  } catch (err: any) {
    console.error('Buy energy error:', err);
    return res.status(500).json({ error: err.message || 'Failed to complete transaction' });
  }
});

export default router;

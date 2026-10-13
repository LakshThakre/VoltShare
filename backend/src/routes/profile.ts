import { Router, Request, Response } from 'express';
import { query } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ============================================================================
// 1. GET PROFILE (Own profile or by ID)
// ============================================================================
router.get('/:id?', requireAuth, async (req: Request, res: Response) => {
  try {
    const targetId = req.params.id || req.user!.id;
    const result = await query(
      `SELECT id, full_name, email, avatar_url, role, 
              smart_meter_id, smart_meter_status, household_load_kw, 
              grid_tariff_inr, created_at
       FROM public.profiles
       WHERE id = $1`,
      [targetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============================================================================
// 2. UPDATE OWN PROFILE (Protected: strictly scoped to req.user.id)
// ============================================================================
router.put('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { fullName, role, smartMeterId, avatarUrl } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role.toLowerCase());
    }
    if (smartMeterId !== undefined) {
      updates.push(`smart_meter_id = $${paramIndex++}`);
      values.push(smartMeterId);
    }
    if (avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(avatarUrl);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    const sql = `UPDATE public.profiles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(sql, values);

    return res.json({ success: true, profile: result.rows[0] });
  } catch (err: any) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

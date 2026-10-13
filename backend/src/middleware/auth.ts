import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { query } from '../db';

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  avatar_url?: string;
  smart_meter_id?: string;
  smart_meter_status?: string;
  household_load_kw?: number;
  grid_tariff_inr?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionToken?: string;
    }
  }
}

export const SESSION_COOKIE_NAME = 'vs_session';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function authenticateSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Read token from HttpOnly cookie or Authorization header fallback
    let rawToken: string | undefined = req.cookies?.[SESSION_COOKIE_NAME];
    if (!rawToken && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        rawToken = parts[1];
      }
    }

    if (!rawToken) {
      return next();
    }

    // 2. Hash token with SHA-256
    const tokenHash = hashToken(rawToken);

    // 3. Find unexpired session in public.sessions
    const sessionRes = await query(
      `SELECT s.id as session_id, s.user_id, s.expires_at, 
              u.email, p.full_name, p.role, p.avatar_url, 
              p.smart_meter_id, p.smart_meter_status, 
              p.household_load_kw, p.grid_tariff_inr
       FROM public.sessions s
       JOIN public.users u ON s.user_id = u.id
       LEFT JOIN public.profiles p ON s.user_id = p.id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [tokenHash]
    );

    if (sessionRes.rows.length === 0) {
      return next();
    }

    const row = sessionRes.rows[0];
    req.user = {
      id: row.user_id,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      avatar_url: row.avatar_url,
      smart_meter_id: row.smart_meter_id,
      smart_meter_status: row.smart_meter_status,
      household_load_kw: row.household_load_kw ? Number(row.household_load_kw) : undefined,
      grid_tariff_inr: row.grid_tariff_inr ? Number(row.grid_tariff_inr) : undefined,
    };
    req.sessionToken = rawToken;

    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
  next();
}

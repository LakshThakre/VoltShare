import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import argon2 from 'argon2';
import { query } from '../db';
import {
  hashToken,
  SESSION_COOKIE_NAME,
  requireAuth,
} from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Plausible email validation regex (RFC 5322 compliant simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// 30-day session expiry in milliseconds
const SESSION_EXPIRY_DAYS = 30;
const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Precomputed dummy Argon2id hash for constant-time mitigation when email does not exist
let DUMMY_ARGON2_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dHVtbXlfc2FsdF8xMjM0NQ$a3Vw93t4y3Q5Q1y2r3T4y5U6i7O8p9A0s1D2f3G4h5I';
(async () => {
  try {
    DUMMY_ARGON2_HASH = await argon2.hash('timing-defense-dummy-password', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  } catch (_) {}
})();

function setSessionCookie(res: Response, rawToken: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY_MS,
  });
}

function clearSessionCookie(res: Response) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Helper: Generate cryptographically secure 32-byte session token
 * and save its SHA-256 hash into public.sessions table.
 */
async function createSession(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);

  await query(
    `INSERT INTO public.sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, now())`,
    [userId, tokenHash, expiresAt]
  );

  return rawToken;
}

// ============================================================================
// 1. SIGNUP ENDPOINT
// ============================================================================
router.post('/signup', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body?.email;
    const password = req.body?.password;
    const fullName = (req.body?.fullName || req.body?.name || '').trim();

    // 1. Email normalization: Trim and lowercase
    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    const email = rawEmail.trim().toLowerCase();

    // 2. Email format validation
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // 3. Password length validation (minimum 8 characters)
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.',
      });
    }

    // 4. Check if email already registered
    const existing = await query('SELECT id FROM public.users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    // 5. Hash password with argon2id
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // 6. Insert new user into public.users
    const userRes = await query(
      `INSERT INTO public.users (id, email, password_hash, created_at)
       VALUES (gen_random_uuid(), $1, $2, now())
       RETURNING id, email, created_at`,
      [email, passwordHash]
    );
    const newUser = userRes.rows[0];

    // Format display name from email if not provided
    const defaultName = fullName || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const meterId = `MTR-${newUser.id.substring(0, 4).toUpperCase()}`;

    // 7. Initialize public.profiles row
    await query(
      `INSERT INTO public.profiles (
         id, full_name, email, avatar_url, role, smart_meter_id, smart_meter_status, household_load_kw, grid_tariff_inr, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
       ON CONFLICT (id) DO NOTHING`,
      [
        newUser.id,
        defaultName,
        email,
        '',
        'both',
        meterId,
        'active',
        2.5,
        8.00,
      ]
    );

    // 8. Initialize public.wallets row
    await query(
      `INSERT INTO public.wallets (id, user_id, balance, energy_balance_kwh, created_at)
       VALUES (gen_random_uuid(), $1, 0.00, 0.00, now())
       ON CONFLICT (user_id) DO NOTHING`,
      [newUser.id]
    );

    // 9. Generate session and set cookie
    const rawToken = await createSession(newUser.id);
    setSessionCookie(res, rawToken);

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: defaultName,
        role: 'both',
        smart_meter_id: meterId,
      },
      token: rawToken,
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// ============================================================================
// 2. LOGIN ENDPOINT
// ============================================================================
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body?.email;
    const password = req.body?.password;

    if (!rawEmail || !password || typeof rawEmail !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    // 1. Trim and lowercase email
    const email = rawEmail.trim().toLowerCase();

    // 2. Find user in public.users
    const userRes = await query(
      `SELECT u.id, u.email, u.password_hash,
              p.full_name, p.role, p.avatar_url, p.smart_meter_id
       FROM public.users u
       LEFT JOIN public.profiles p ON u.id = p.id
       WHERE u.email = $1`,
      [email]
    );

    const user = userRes.rows[0];

    // Constant-time defense: If email does not exist, run dummy argon2 verify
    // so response timing does not reveal registered email addresses.
    if (!user) {
      await argon2.verify(DUMMY_ARGON2_HASH, password);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Verify password against stored hash with argon2id
    const isMatch = await argon2.verify(user.password_hash, password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 4. Generate 32-byte secure session token
    const rawToken = await createSession(user.id);
    setSessionCookie(res, rawToken);

    return res.json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name || '',
        role: user.role || 'both',
        avatar_url: user.avatar_url || '',
        smart_meter_id: user.smart_meter_id || '',
      },
      token: rawToken,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login error occurred. Please try again.' });
  }
});

// ============================================================================
// 3. LOGOUT ENDPOINT
// ============================================================================
router.post('/logout', async (req: Request, res: Response) => {
  try {
    let rawToken: string | undefined = req.cookies?.[SESSION_COOKIE_NAME] || req.sessionToken;
    if (!rawToken && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        rawToken = parts[1];
      }
    }

    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      // Delete session row from public.sessions table
      await query('DELETE FROM public.sessions WHERE token_hash = $1', [tokenHash]);
    }

    // Clear session cookie
    clearSessionCookie(res);

    return res.json({ message: 'Logged out successfully' });
  } catch (err: any) {
    console.error('Logout error:', err);
    clearSessionCookie(res);
    return res.status(500).json({ error: 'Logout error occurred' });
  }
});

// ============================================================================
// 4. CURRENT USER ENDPOINT (/me)
// ============================================================================
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRes = await query(
      `SELECT u.id, u.email, u.created_at,
              p.full_name, p.role, p.avatar_url, p.smart_meter_id, 
              p.smart_meter_status, p.household_load_kw, p.grid_tariff_inr
       FROM public.users u
       LEFT JOIN public.profiles p ON u.id = p.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: userRes.rows[0] });
  } catch (err: any) {
    console.error('/me error:', err);
    return res.status(500).json({ error: 'Failed to fetch current user' });
  }
});

// ============================================================================
// PASSWORD RESET PLUG-IN SPOT (Marked for future expansion)
// ============================================================================
// [FUTURE EXTENSION SPOT]: Password reset flow would plug in here:
// router.post('/forgot-password', authRateLimiter, async (req, res) => {
//   1. Validate email.
//   2. Generate secure one-time reset token (e.g. crypto.randomBytes(32)).
//   3. Store token hash and short expiry (e.g. 1 hour) in password_reset_tokens table.
//   4. Send reset link via SMTP / Email provider.
//   5. Return generic success message to prevent user enumeration.
// });
// router.post('/reset-password', authRateLimiter, async (req, res) => {
//   1. Verify reset token and check expiration.
//   2. Validate new password (>= 8 chars).
//   3. Hash with argon2id and update public.users password_hash.
//   4. Invalidate all active user sessions in public.sessions for security.
// });

export default router;

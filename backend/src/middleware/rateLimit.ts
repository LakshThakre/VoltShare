import { Request, Response, NextFunction } from 'express';

interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
}

const attempts = new Map<string, AttemptRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_ATTEMPTS = 20;      // 20 attempts per minute

// Cleanup old keys periodically
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts.entries()) {
    if (now - record.firstAttemptAt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, 30 * 1000);
cleanupTimer.unref();

export function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const email = (req.body?.email || '').trim().toLowerCase();
  
  const now = Date.now();
  const key = `${ip}:${email}`;

  const current = attempts.get(key);

  if (!current || now - current.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now });
    return next();
  }

  if (current.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((current.firstAttemptAt + WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', retryAfter.toString());
    return res.status(429).json({
      error: 'Too many attempts. Please wait a minute before trying again.',
      retryAfterSeconds: retryAfter,
    });
  }

  current.count += 1;
  next();
}

// Helper to reset rate limits (useful for testing)
export function resetRateLimits() {
  attempts.clear();
}

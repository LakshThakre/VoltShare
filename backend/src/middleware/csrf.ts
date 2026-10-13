import { Request, Response, NextFunction } from 'express';

export function csrfOriginCheck(req: Request, res: Response, next: NextFunction) {
  // Safe HTTP methods don't modify state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const target = origin || referer;

  // Requests from native mobile apps or non-browser clients (like curl, expo client)
  // often don't have an Origin header, which is safe from browser cross-site abuse.
  if (!target) {
    return next();
  }

  try {
    const url = new URL(target);
    const host = url.hostname;

    // Check if host is private LAN IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x, 127.0.0.1)
    const isPrivateIp = /^(127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host);

    // Allow localhost, local network IPs, expo tunnel, ngrok, or matching server host
    const isAllowed =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      isPrivateIp ||
      host === req.hostname ||
      host.endsWith('.exp.direct') ||
      host.endsWith('.ngrok.io') ||
      host.endsWith('.ngrok-free.app') ||
      host.endsWith('.ngrok.app') ||
      url.protocol === 'exp:' ||
      url.protocol === 'voltshare:';

    if (!isAllowed) {
      console.warn(`[CSRF] Rejected origin: ${target} (host: ${host}, req.hostname: ${req.hostname})`);
      return res.status(403).json({ error: 'Forbidden: Cross-site request rejected' });
    }

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: Invalid request origin' });
  }
}

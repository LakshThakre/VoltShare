const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);
const originalEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const app = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(metroMiddleware, server)
      : metroMiddleware;

    return (req, res, next) => {
      // Proxy /api and /health requests directly to the backend server
      if (req.url && (req.url.startsWith('/api') || req.url.startsWith('/health'))) {
        const backendPort = process.env.BACKEND_PORT || 4000;
        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port: backendPort,
            path: req.url,
            method: req.method,
            headers: {
              ...req.headers,
              host: `127.0.0.1:${backendPort}`,
              'x-forwarded-host': req.headers.host || '',
              'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http',
            },
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          }
        );

        proxyReq.on('error', (err) => {
          console.error(`[Metro API Proxy Error] Cannot reach backend on port ${backendPort}:`, err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: `Backend server unreachable on port ${backendPort}. Please ensure 'npm run dev:backend' is running!`,
            })
          );
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      return app(req, res, next);
    };
  },
};

module.exports = config;

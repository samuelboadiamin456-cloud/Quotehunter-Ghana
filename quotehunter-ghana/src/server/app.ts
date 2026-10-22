import express from 'express';
import { apiRouter } from './routes.ts';
import { createRateLimiter } from '../middleware/rateLimit.ts';
import { billingRouter, paystackWebhook } from './billing.ts';

export function createServerApp() {
  const app = express();

  // Trust proxy for secure headers on Cloud Run / GCP reverse proxies
  app.set('trust proxy', 1);

  // Security Headers (Defense-in-depth)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Global rate limiter (Generous limit to ensure normal procurement usage is never blocked)
  const globalApiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 300,
    name: 'global-api',
    message: 'QuoteHunter API rate limit exceeded. Please wait a moment.',
  });
  app.use('/api', globalApiLimiter);

  // Paystack webhook needs the raw body to check its signature, so it is registered before express.json
  app.post('/api/billing/webhook', express.raw({ type: '*/*', limit: '1mb' }), paystackWebhook);

  // Controlled Body Parsing: 1MB general limit
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // API Routes
  app.use('/api/billing', billingRouter);
  app.use('/api', apiRouter);

  // Global Error Handler (Sanitizes technical details)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Server Internal Error:', err);
    res.status(err.status || 500).json({
      error: 'An unexpected system error occurred. Please try again or contact support.',
    });
  });

  return app;
}

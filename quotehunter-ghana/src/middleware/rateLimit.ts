import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    tokens: number;
    lastReset: number;
  };
}

const stores = new Map<string, RateLimitStore>();

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  name?: string;
}

/**
 * In-memory sliding window rate limiter.
 * Protects public and sensitive API endpoints against brute force, denial of service,
 * and malicious flooding without interrupting normal operations.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests, please slow down and try again later.', name = 'default' } = options;
  
  if (!stores.has(name)) {
    stores.set(name, {});
  }
  const store = stores.get(name)!;

  // Periodic cleanup of expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const key in store) {
      if (now - store[key].lastReset > windowMs * 2) {
        delete store[key];
      }
    }
  }, 300000).unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    // Generate key: uid after login, IP only for unauthenticated requests
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const user = (req as any).user;
    const key = user?.uid ? `user_${user.uid}` : `ip_${clientIp}`;

    const now = Date.now();
    if (!store[key] || now - store[key].lastReset > windowMs) {
      store[key] = {
        tokens: 1,
        lastReset: now,
      };
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      return next();
    }

    store[key].tokens += 1;
    const remaining = Math.max(0, max - store[key].tokens);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);

    if (store[key].tokens > max) {
      const retryAfterSec = Math.ceil((store[key].lastReset + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSec,
      });
    }

    next();
  };
}

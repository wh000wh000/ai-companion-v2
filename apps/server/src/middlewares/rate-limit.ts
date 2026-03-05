import type { MiddlewareHandler } from 'hono'

import type { HonoEnv } from '../types/hono'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum requests allowed per window */
  maxRequests: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Periodically clean up expired entries to prevent memory leaks.
 * Runs every 60 seconds.
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 60_000)

/**
 * Creates a rate limiter middleware using an in-memory counter.
 *
 * Rate limiting is keyed by userId from the Hono context.
 * Returns 429 Too Many Requests when the limit is exceeded.
 */
export function createRateLimiter(options: RateLimiterOptions): MiddlewareHandler<HonoEnv> {
  const { windowMs, maxRequests } = options

  return async (c, next) => {
    const user = c.get('user')
    if (!user) {
      // If no user is set, skip rate limiting (auth middleware should handle this)
      return await next()
    }

    const key = `${user.id}:${c.req.path}:${windowMs}:${maxRequests}`
    const now = Date.now()
    let entry = rateLimitStore.get(key)

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      rateLimitStore.set(key, entry)
    }

    entry.count++

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return c.json(
        {
          error: 'RATE_LIMITED',
          message: 'Too many requests',
          retryAfter,
        },
        429,
      )
    }

    await next()
  }
}

/**
 * Resets the rate limit store (for testing only).
 */
export function resetRateLimitStore() {
  rateLimitStore.clear()
}

/** Charge endpoint: 5 requests per minute */
export const chargeRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 })

/** Gift endpoint: 10 requests per minute */
export const giftRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })

/** Query endpoints: 60 requests per minute */
export const queryRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 })

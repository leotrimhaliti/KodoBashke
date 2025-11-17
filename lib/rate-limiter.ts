interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  check(key: string, config: RateLimitConfig): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    // Clean up expired entries
    if (entry && now >= entry.resetTime) {
      this.limits.delete(key);
    }

    const current = this.limits.get(key);

    if (!current) {
      // First attempt
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return { allowed: true };
    }

    if (current.count >= config.maxAttempts) {
      const retryAfter = Math.ceil((current.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Increment counter
    current.count += 1;
    return { allowed: true };
  }

  reset(key: string): void {
    this.limits.delete(key);
  }

  clear(): void {
    this.limits.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Predefined rate limit configs
export const RATE_LIMITS = {
  LOGIN: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  SIGNUP: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  MESSAGE: { maxAttempts: 30, windowMs: 60 * 1000 }, // 30 messages per minute
  SWIPE: { maxAttempts: 100, windowMs: 60 * 1000 }, // 100 swipes per minute
  PROFILE_UPDATE: { maxAttempts: 10, windowMs: 60 * 1000 }, // 10 updates per minute
  IMAGE_UPLOAD: { maxAttempts: 5, windowMs: 5 * 60 * 1000 }, // 5 uploads per 5 minutes
};

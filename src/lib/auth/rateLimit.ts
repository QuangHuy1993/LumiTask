type RateLimitEntry = {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
};

const store = new Map<string, RateLimitEntry>();

type RateLimitConfig = {
  maxAttempts: number;
  windowMs: number;
};

export const rateLimitService = {
  async check(key: string, config: RateLimitConfig) {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now - entry.firstAttemptAt > config.windowMs) {
      return { allowed: true };
    }

    if (entry.attempts >= config.maxAttempts) {
      const retryAfterMs = config.windowMs - (now - entry.firstAttemptAt);
      return { allowed: false, retryAfterMs };
    }

    return { allowed: true };
  },

  async increment(key: string) {
    const now = Date.now();
    const entry = store.get(key);
    if (entry) {
      entry.attempts += 1;
      entry.lastAttemptAt = now;
    } else {
      store.set(key, { attempts: 1, firstAttemptAt: now, lastAttemptAt: now });
    }
  },

  async reset(key: string) {
    store.delete(key);
  },
};

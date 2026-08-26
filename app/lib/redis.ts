import Redis from 'ioredis';

let client: Redis | null = null;

/**
 * Returns a shared Redis client, or null if REDIS_URL isn't configured yet.
 * Callers should always handle the null case gracefully (fail open) —
 * caching/rate-limiting are nice-to-haves, not requirements for the app to work.
 */
export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    });
    client.on('error', () => {
      // Swallow connection errors here — callers already wrap usage in try/catch.
    });
  }
  return client;
}

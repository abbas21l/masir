import { NextResponse } from 'next/server';
import { getRedis } from '../../lib/redis';

export const runtime = 'nodejs';

// Public, read-only: just topic + level names, nothing sensitive.
// Used by the /archive page so anyone (no login) can browse everything
// that's ever been generated.
export async function GET() {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ items: [] });
  }

  try {
    const raw = await redis.zrevrange('masir:search:counts', 0, 199, 'WITHSCORES');
    const items: { level: string; topic: string; count: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      const [level, ...topicParts] = raw[i].split(':');
      items.push({
        level,
        topic: topicParts.join(':'),
        count: parseInt(raw[i + 1], 10),
      });
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

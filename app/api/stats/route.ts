import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '../../lib/redis';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const providedKey = req.nextUrl.searchParams.get('key');
  const realKey = process.env.SEED_SECRET; // reuse the same secret, no need for a new one

  if (!realKey || providedKey !== realKey) {
    return NextResponse.json({ error: 'کلید اشتباهه.' }, { status: 403 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: 'Redis وصل نیست.' }, { status: 500 });
  }

  try {
    const totalSearches = await redis.zcard('masir:search:counts');
    const topRaw = await redis.zrevrange('masir:search:counts', 0, 19, 'WITHSCORES');
    const topTopics: { key: string; count: number }[] = [];
    for (let i = 0; i < topRaw.length; i += 2) {
      topTopics.push({ key: topRaw[i], count: parseInt(topRaw[i + 1], 10) });
    }

    const recentRaw = await redis.lrange('masir:search:log', 0, 49);
    const recentSearches = recentRaw.map((r) => {
      try {
        return JSON.parse(r);
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({
      totalUniqueQueries: totalSearches,
      topTopics,
      recentSearches,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'خطا: ' + e.message }, { status: 500 });
  }
}

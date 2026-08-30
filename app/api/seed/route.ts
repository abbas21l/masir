import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '../../lib/redis';
import { SEED_PATHS } from './seedData';

export const runtime = 'nodejs';
export const maxDuration = 30;

function cacheKey(topic: string, level: string, languages: string[] = ['fa', 'en']): string {
  const normalized = topic.trim().toLowerCase().replace(/\s+/g, ' ');
  const langKey = [...languages].sort().join('+');
  return `masir:path:${level}:${langKey}:${normalized}`;
}

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 365;

export async function GET(req: NextRequest) {
  const providedKey = req.nextUrl.searchParams.get('key');
  const realKey = process.env.SEED_SECRET;

  if (!realKey) {
    return NextResponse.json(
      { error: 'SEED_SECRET روی Vercel تنظیم نشده.' },
      { status: 500 }
    );
  }
  if (providedKey !== realKey) {
    return NextResponse.json({ error: 'کلید اشتباهه.' }, { status: 403 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis وصل نیست. مطمئن شو دیتابیس Redis به این پروژه Connect شده و REDIS_URL توی Environment Variables هست.' },
      { status: 500 }
    );
  }

  const results: string[] = [];

  for (const entry of SEED_PATHS) {
    try {
      const key = cacheKey(entry.topic, entry.level);
      await redis.set(key, JSON.stringify(entry.path), 'EX', CACHE_TTL_SECONDS);
      results.push(`✓ ${entry.topic} (${entry.level})`);
    } catch (e: any) {
      results.push(`✗ ${entry.topic}: ${e.message}`);
    }
  }

  return NextResponse.json({
    message: `${SEED_PATHS.length} مسیر seed شد.`,
    results,
  });
}

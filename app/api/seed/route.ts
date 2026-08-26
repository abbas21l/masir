import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { SEED_PATHS } from './seedData';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Must exactly match the cacheKey() logic in app/api/generate/route.ts
// so that seeded entries are found by the normal generate flow.
function cacheKey(topic: string, level: string): string {
  const normalized = topic.trim().toLowerCase().replace(/\s+/g, ' ');
  return `masir:path:${level}:${normalized}`;
}

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 365; // seeded paths kept a full year

export async function GET(req: NextRequest) {
  const providedKey = req.nextUrl.searchParams.get('key');
  const realKey = process.env.SEED_SECRET;

  if (!realKey) {
    return NextResponse.json(
      { error: 'SEED_SECRET روی Vercel تنظیم نشده. یه Environment Variable به اسم SEED_SECRET با یه مقدار دلخواه اضافه کن.' },
      { status: 500 }
    );
  }
  if (providedKey !== realKey) {
    return NextResponse.json({ error: 'کلید اشتباهه.' }, { status: 403 });
  }

  const results: string[] = [];

  for (const entry of SEED_PATHS) {
    try {
      const key = cacheKey(entry.topic, entry.level);
      await kv.set(key, entry.path, { ex: CACHE_TTL_SECONDS });
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

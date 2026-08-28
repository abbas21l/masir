import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '../../lib/redis';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;

function cacheKey(topic: string, level: string): string {
  const normalized = topic.trim().toLowerCase().replace(/\s+/g, ' ');
  return `masir:path:${level}:${normalized}`;
}

const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

async function checkRateLimit(ip: string): Promise<{ allowed: boolean }> {
  const redis = getRedis();
  if (!redis) return { allowed: true };

  try {
    const key = `masir:ratelimit:${ip}`;
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }
    return { allowed: current <= RATE_LIMIT_MAX };
  } catch {
    return { allowed: true };
  }
}

// Archives every search (topic + level + timestamp), keeps the last 500,
// and tallies topic frequency for a "most searched" view.
// Best-effort — never blocks or breaks the main flow.
async function logSearch(topic: string, level: string, wasCached: boolean): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const entry = JSON.stringify({ topic: topic.trim(), level, cached: wasCached, at: Date.now() });
    await redis.lpush('masir:search:log', entry);
    await redis.ltrim('masir:search:log', 0, 499);
    const normalized = topic.trim().toLowerCase().replace(/\s+/g, ' ');
    await redis.zincrby('masir:search:counts', 1, `${level}:${normalized}`);
  } catch {
    // Logging is a nice-to-have, never break the app over it.
  }
}

const SYSTEM_PROMPT = `تو یک متخصص طراحی مسیر یادگیری هستی که برای کاربران فارسی‌زبان، مسیرهای یادگیری واقعی، شفاف و قابل‌اجرا طراحی می‌کنی.

قوانین مهم:
- همیشه به زبان فارسی پاسخ بده.
- مسیر را دقیقاً بر اساس سطح درخواستی کاربر (مبتدی، متوسط، پیشرفته) تنظیم کن.
- مسیر باید واقعی و قابل‌اجرا باشد، نه ایده‌آل و غیرعملی.
- تعداد مراحل بین ۵ تا ۸ مرحله (بسته به موضوع).
- از کلی‌گویی پرهیز کن. هر مرحله باید دقیق بگوید «چه چیزی» باید یاد گرفته شود و «چرا» این مرحله مهم است.
- لحن صمیمی، واضح، تشویق‌کننده، ولی جدی و حرفه‌ای.

قانون حیاتی درباره‌ی منابع (این را دقیق رعایت کن):
هرگز اسم یک دوره، کتاب، یا مقاله‌ی خاص را با ادعای «این دقیقاً وجود دارد» نیاور، چون نمی‌توانی از وجود دقیق آن مطمئن باشی و لینک/عنوان اشتباه اعتبار کل ابزار را خدشه‌دار می‌کند.
به‌جایش:
- نوع منبع را توصیف کن (مثلاً «یک دوره‌ی مقدماتی ویدیویی» یا «مستندات رسمی»).
- اگر یک پلتفرم فارسی معروف و شناخته‌شده مرتبط است (مثل مکتب‌خونه، کوئرا کالج، سایت‌های آموزش تخصصی حوزه)، فقط اسم *پلتفرم* را به‌عنوان «جایی که معمولاً چنین محتوایی پیدا می‌شود» بیاور، نه عنوان یک دوره‌ی خاص با ادعای قطعیت.
- برای انگلیسی، منابع شناخته‌شده و معتبر (مثل مستندات رسمی، freeCodeCamp، Real Python) را می‌توانی با اطمینان بیشتری نام ببری چون این‌ها منابع پایه و پایدار شناخته‌شده‌اند، اما باز هم عنوان یک درس خیلی خاص و جزئی را با قطعیت ادعا نکن.
- همیشه زبان منبع را مشخص کن.

خروجی را دقیقاً به‌صورت یک JSON معتبر (بدون هیچ متن اضافه قبل یا بعدش، بدون markdown code fence) با این ساختار بده:

{
  "topic": "موضوع",
  "level": "مبتدی یا متوسط یا پیشرفته",
  "goal": "یک جمله‌ی واضح درباره‌ی هدف نهایی این مسیر",
  "steps": [
    {
      "title": "عنوان مرحله",
      "goal": "هدف این مرحله در یک جمله",
      "what_to_learn": "چه چیزی باید یاد بگیرد",
      "why_it_matters": "چرا این مرحله مهم است",
      "resources": [
        {"name": "توصیف منبع", "type": "نوع منبع (ویدیو/متن/مستندات/دوره)", "language": "فارسی یا انگلیسی"}
      ],
      "expected_outcome": "کاربر بعد از این مرحله چه توانایی‌ای پیدا می‌کند"
    }
  ],
  "final_note": "یک توصیه‌ی کاربردی و انگیزشی کوتاه برای ادامه‌ی مسیر"
}`;

export async function POST(req: NextRequest) {
  try {
    const { topic, level } = await req.json();

    if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
      return NextResponse.json({ error: 'موضوع رو وارد کن.' }, { status: 400 });
    }
    if (!['مبتدی', 'متوسط', 'پیشرفته'].includes(level)) {
      return NextResponse.json({ error: 'سطح نامعتبره.' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'در یک ساعت گذشته زیاد مسیر ساختی. یه‌کم صبر کن و دوباره امتحان کن.' },
        { status: 429 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'کلید API روی سرور تنظیم نشده.' }, { status: 500 });
    }

    const key = cacheKey(topic, level);
    const redis = getRedis();

    if (redis) {
      try {
        const cached = await redis.get(key);
        if (cached) {
          await logSearch(topic, level, true);
          return NextResponse.json({ path: JSON.parse(cached), cached: true });
        }
      } catch {
        // Redis hiccup — proceed without caching.
      }
    }

    const userMessage = `موضوع: ${topic.trim()}\nسطح: ${level}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `خطای API: ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data.content?.find((b: any) => b.type === 'text')?.text ?? '';

    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return NextResponse.json({ error: 'پاسخ مدل قابل‌پردازش نبود. دوباره امتحان کن.' }, { status: 502 });
    }

    if (redis) {
      try {
        await redis.set(key, JSON.stringify(parsed), 'EX', CACHE_TTL_SECONDS);
      } catch {
        // Fine, just skip caching.
      }
    }

    await logSearch(topic, level, false);

    return NextResponse.json({ path: parsed, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: 'خطای غیرمنتظره: ' + e.message }, { status: 500 });
  }
}

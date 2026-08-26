import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Cache generated paths for 90 days — same topic+level won't hit the API again.
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;

function cacheKey(topic: string, level: string): string {
  const normalized = topic.trim().toLowerCase().replace(/\s+/g, ' ');
  return `masir:path:${level}:${normalized}`;
}

// Rate limiting: max 8 generations per IP per hour.
// Uses the same KV store as caching — if KV isn't set up yet,
// rate limiting is skipped (fails open, doesn't break the app).
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `masir:ratelimit:${ip}`;
  try {
    const current = (await kv.get<number>(key)) ?? 0;
    if (current >= RATE_LIMIT_MAX) {
      return { allowed: false, remaining: 0 };
    }
    const newCount = await kv.incr(key);
    if (newCount === 1) {
      await kv.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    }
    return { allowed: true, remaining: RATE_LIMIT_MAX - newCount };
  } catch {
    // KV not configured — allow the request through (fail open).
    return { allowed: true, remaining: RATE_LIMIT_MAX };
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

    // Check cache first — if this exact topic+level was generated before, reuse it.
    // If Vercel KV isn't set up yet, this silently falls through (no crash).
    try {
      const cached = await kv.get(key);
      if (cached) {
        return NextResponse.json({ path: cached, cached: true });
      }
    } catch {
      // KV not configured yet — proceed without caching, don't break the feature.
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

    // Strip potential markdown code fences just in case
    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return NextResponse.json({ error: 'پاسخ مدل قابل‌پردازش نبود. دوباره امتحان کن.' }, { status: 502 });
    }

    // Save to cache for next time — best-effort, never blocks the response.
    try {
      await kv.set(key, parsed, { ex: CACHE_TTL_SECONDS });
    } catch {
      // KV not configured yet — fine, just skip caching.
    }

    return NextResponse.json({ path: parsed, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: 'خطای غیرمنتظره: ' + e.message }, { status: 500 });
  }
}

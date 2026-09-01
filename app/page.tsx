'use client';

import { useState, useEffect } from 'react';

type Resource = { name: string; type: string; language: string; url?: string };
type Step = {
  title: string;
  goal: string;
  what_to_learn: string;
  why_it_matters: string;
  resources: Resource[];
  expected_outcome: string;
};
type LearningPath = {
  topic: string;
  level: string;
  goal: string;
  steps: Step[];
  final_note: string;
};
type SavedPath = LearningPath & { id: string; savedAt: number };

const LEVELS = ['مبتدی', 'متوسط', 'پیشرفته'] as const;
const LANGUAGE_OPTIONS = [
  { value: 'fa', label: 'فارسی' },
  { value: 'en', label: 'انگلیسی' },
  { value: 'ar', label: 'عربی' },
  { value: 'de', label: 'آلمانی' },
  { value: 'fr', label: 'فرانسوی' },
] as const;
const SUGGESTIONS = ['یادگیری پایتون', 'مدیریت زمان', 'نوشتن پروپوزال', 'هوش مصنوعی برای مدیران', 'رهبری تیم'];

// If a resource doesn't have a real, verified url (true for most AI-generated
// paths, since we deliberately never let the model claim a specific URL),
// build a safe search link instead — always works, never hallucinated.
function resourceLink(r: Resource, topic?: string): string {
  if (r.url) return r.url;

  const isVideo = r.type.includes('ویدیو') || r.type.includes('یوتیوب');
  const isPersian = r.language.includes('فارسی');
  const isCourse = r.type.includes('دوره');

  // Include the main topic in the query for better relevance
  // (a search for just "دوره‌های مقدماتی" is vague; adding the topic fixes that).
  const queryText = topic ? `${r.name} ${topic}` : r.name;
  const query = encodeURIComponent(queryText);

  if (isVideo) {
    return `https://www.youtube.com/results?search_query=${query}`;
  }

  // Persian course-type resources: bias the search toward known, reputable
  // Persian learning platforms instead of a generic open search.
  if (isPersian && isCourse) {
    const biased = encodeURIComponent(
      `${queryText} (site:maktabkhooneh.org OR site:quera.org OR site:faradars.org)`
    );
    return `https://www.google.com/search?q=${biased}`;
  }

  return `https://www.google.com/search?q=${query}`;
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('مبتدی');
  const [languages, setLanguages] = useState<string[]>(['fa', 'en']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [path, setPath] = useState<LearningPath | null>(null);
  const [savedPaths, setSavedPaths] = useState<SavedPath[]>([]);
  const [openStep, setOpenStep] = useState<number | null>(0);
  const [loadingLong, setLoadingLong] = useState(false);
  const [saveConfirmed, setSaveConfirmed] = useState(false);
  const [qafaseItems, setQafaseItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('masir-saved-paths');
      if (raw) setSavedPaths(JSON.parse(raw));
    } catch {}

    // If coming from /archive with ?topic=&level=, auto-load that path.
    const params = new URLSearchParams(window.location.search);
    const urlTopic = params.get('topic');
    const urlLevel = params.get('level');
    if (urlTopic && urlLevel && LEVELS.includes(urlLevel as any)) {
      setTopic(urlTopic);
      setLevel(urlLevel as (typeof LEVELS)[number]);
      runGenerate(urlTopic, urlLevel);
    }

    fetch('/api/qafase')
      .then((r) => r.json())
      .then((data) => setQafaseItems(data.items || []))
      .catch(() => {});
  }, []);

  function toggleLanguage(val: string) {
    setLanguages((prev) => {
      if (prev.includes(val)) {
        const next = prev.filter((l) => l !== val);
        return next.length ? next : prev; // never allow zero languages selected
      }
      return [...prev, val];
    });
  }

  async function runGenerate(topicVal: string, levelVal: string, languagesVal: string[] = languages) {
    if (!topicVal.trim()) return;
    setLoading(true);
    setLoadingLong(false);
    setError('');
    setPath(null);

    const longTimer = setTimeout(() => setLoadingLong(true), 8000);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topicVal, level: levelVal, languages: languagesVal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'یه چیزی اشتباه پیش رفت.');
      } else {
        setPath(data.path);
        setOpenStep(0);
      }
    } catch {
      setError('ارتباط با سرور برقرار نشد. دوباره امتحان کن.');
    } finally {
      clearTimeout(longTimer);
      setLoading(false);
    }
  }

  async function generatePath(e: React.FormEvent) {
    e.preventDefault();
    await runGenerate(topic, level, languages);
  }

  function savePath() {
    if (!path) return;
    const entry: SavedPath = { ...path, id: crypto.randomUUID(), savedAt: Date.now() };
    const updated = [entry, ...savedPaths];
    setSavedPaths(updated);
    localStorage.setItem('masir-saved-paths', JSON.stringify(updated));
    setSaveConfirmed(true);
    setTimeout(() => setSaveConfirmed(false), 3000);
  }

  function removeSaved(id: string) {
    const updated = savedPaths.filter((p) => p.id !== id);
    setSavedPaths(updated);
    localStorage.setItem('masir-saved-paths', JSON.stringify(updated));
  }

  function reset() {
    setPath(null);
    setError('');
    setTopic('');
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="max-w-2xl mx-auto px-5 pt-10 pb-4 flex items-center justify-between">
        <button onClick={reset} className="flex items-center gap-2">
          <img src="/logo.svg" alt="مسیر" width="32" height="32" />
          <span className="font-bold text-lg">مسیر</span>
        </button>
        <a href="/archive" className="text-xs text-teal-dark hover:underline">آرشیو عمومی</a>
      </header>

      {!path && !loading && (
        <section className="max-w-xl mx-auto px-5 pt-10 pb-20 fade-up">
          <h1 className="text-2xl md:text-3xl font-bold leading-relaxed mb-3">
            چی می‌خوای یاد بگیری؟
          </h1>
          <p className="text-grey-500 text-sm mb-8 leading-relaxed">
            یه موضوع بنویس، سطحت رو انتخاب کن. یه مسیر واقعی و قابل‌اجرا می‌سازیم، نه یه لیست کلی و آرمانی.
          </p>

          <form onSubmit={generatePath} className="space-y-5">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="مثلاً: یادگیری پایتون، مدیریت زمان، نوشتن پروپوزال..."
              className="w-full px-5 py-4 rounded-2xl border border-grey-400/40 bg-white text-base focus:border-teal outline-none"
              autoFocus
            />

            <div className="flex gap-2">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-colors ${
                    level === l
                      ? 'bg-teal text-white border-teal'
                      : 'bg-white text-grey-700 border-grey-400/40 hover:border-teal/50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div>
              <div className="text-xs text-grey-500 mb-2">زبان‌هایی که راحتی (می‌تونی چندتا انتخاب کنی)</div>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => toggleLanguage(l.value)}
                    className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                      languages.includes(l.value)
                        ? 'bg-amber text-white border-amber'
                        : 'bg-white text-grey-700 border-grey-400/40 hover:border-amber/50'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={!topic.trim()}
              className="w-full py-4 rounded-2xl bg-teal text-white font-bold text-base hover:bg-teal-dark transition-colors disabled:opacity-40"
            >
              مسیرم رو بساز ←
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="text-xs text-grey-400 w-full mb-1">یا یکی از این‌ها رو امتحان کن:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setTopic(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-grey-400/30 hover:border-teal/50 hover:text-teal-dark transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {savedPaths.length > 0 && (
            <div className="mt-14">
              <h2 className="text-sm font-bold text-grey-700 mb-3">مسیرهای ذخیره‌شده</h2>
              <div className="space-y-2">
                {savedPaths.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-2 bg-white border border-grey-400/30 rounded-xl px-4 py-3">
                    <button onClick={() => setPath(sp)} className="flex-1 text-right">
                      <div className="text-sm font-medium">{sp.topic}</div>
                      <div className="text-xs text-grey-500 mt-0.5">{sp.level} · {sp.steps.length} مرحله</div>
                    </button>
                    <button onClick={() => removeSaved(sp.id)} className="text-xs text-grey-400 hover:text-red-500 px-2">حذف</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-16 pt-10 border-t border-grey-400/20">
            <h2 className="text-lg font-bold mb-4">مسیر چطور کار می‌کنه؟</h2>
            <p className="text-sm text-grey-700 leading-loose mb-4">
              مسیر یه ابزار رایگانه که برای هر موضوعی که بخوای یاد بگیری — از برنامه‌نویسی گرفته تا مهارت‌های مدیریتی و زبان — یه برنامه‌ی یادگیری واقعی و قابل‌اجرا می‌سازه. کافیه موضوع، سطح (مبتدی تا پیشرفته)، و زبان‌هایی که باهاشون راحتی رو انتخاب کنی؛ مسیر برات چند مرحله‌ی مشخص با منابع واقعی می‌سازه، نه یه لیست کلی و آرمانی.
            </p>
            <p className="text-sm text-grey-700 leading-loose">
              نیازی به ثبت‌نام نیست. هر مسیری که ساخته می‌شه توی{' '}
              <a href="/archive" className="text-teal-dark underline">آرشیو عمومی</a> قابل‌مشاهده‌ست، و می‌تونی مسیرهای دلخواهت رو توی همین مرورگر ذخیره کنی. مسیر بخشی از{' '}
              <a href="https://abbasramezani.com" className="text-teal-dark underline">abbasramezani.com</a> است.
            </p>
          </div>

          {qafaseItems.length > 0 && (
            <div className="mt-16 pt-10 border-t border-grey-400/20">
              <h2 className="text-lg font-bold mb-1">مطالب پیشنهادی برای یادگیری</h2>
              <p className="text-xs text-grey-500 mb-5">از قفسه‌ی abbasramezani.com</p>
              <div className="space-y-3">
                {qafaseItems.slice(0, 5).map((item: any, i: number) => {
                  const title = item.title || item.fa_title || item.translated_title || 'بدون عنوان';
                  const url = item.url || item.source_url || item.link || '#';
                  const source = item.source_name || item.source || '';
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white border border-grey-400/30 rounded-xl px-4 py-3 hover:border-teal/50 transition-colors"
                    >
                      <div className="text-sm font-medium">{title}</div>
                      {source && <div className="text-xs text-grey-400 mt-1">{source}</div>}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {loading && (
        <section className="max-w-xl mx-auto px-5 py-32 text-center fade-up">
          <div className="inline-flex gap-1.5 mb-6">
            <span className="w-2.5 h-2.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-teal animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-grey-500 text-sm">
            {loadingLong ? 'داره دقیق فکر می‌کنه، چند ثانیه‌ی دیگه تموم می‌شه...' : 'داریم مسیرت رو می‌سازیم...'}
          </p>
        </section>
      )}

      {path && !loading && (
        <section className="max-w-2xl mx-auto px-5 pb-24 fade-up">
          <div className="mb-8">
            <span className="inline-block text-xs font-medium text-teal-dark bg-teal-light px-3 py-1 rounded-full mb-3">
              {path.level}
            </span>
            <h1 className="text-2xl font-bold mb-2">{path.topic}</h1>
            <p className="text-grey-500 text-sm leading-relaxed">{path.goal}</p>
          </div>

          <div className="trail space-y-6">
            {path.steps.map((step, i) => (
              <div key={i} className="waypoint flex gap-4">
                <div className="waypoint-marker">{i + 1}</div>
                <div className="flex-1 bg-white border border-grey-400/30 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenStep(openStep === i ? null : i)}
                    className="w-full text-right px-5 py-4 flex items-center justify-between gap-3"
                  >
                    <span className="font-bold text-[15px]">{step.title}</span>
                    <span className="text-grey-400 text-xs shrink-0">{openStep === i ? '−' : '+'}</span>
                  </button>
                  {openStep === i && (
                    <div className="px-5 pb-5 space-y-4 text-sm leading-relaxed">
                      <p className="text-grey-700">{step.goal}</p>
                      <div>
                        <div className="text-xs font-bold text-grey-500 mb-1">چه چیزی یاد می‌گیری</div>
                        <p>{step.what_to_learn}</p>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-grey-500 mb-1">چرا مهمه</div>
                        <p>{step.why_it_matters}</p>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-grey-500 mb-1.5">منابع پیشنهادی</div>
                        <ul className="space-y-1.5">
                          {step.resources.map((r, ri) => (
                            <li key={ri} className="flex items-start gap-2 text-grey-700">
                              <span className="text-teal mt-0.5">•</span>
                              <span>
                                <a
                                  href={resourceLink(r, path.topic)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-dark underline decoration-teal/30 hover:decoration-teal"
                                >
                                  {r.name}
                                </a>{' '}
                                <span className="text-grey-400">
                                  ({r.type} · {r.language}{!r.url && ' · جست‌وجو'})
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-teal-light rounded-xl px-4 py-3">
                        <div className="text-xs font-bold text-teal-dark mb-1">خروجی این مرحله</div>
                        <p className="text-teal-dark">{step.expected_outcome}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="waypoint flex gap-4">
              <div className="waypoint-marker finish">✓</div>
              <div className="flex-1 bg-amber-light border border-amber/30 rounded-2xl px-5 py-4">
                <div className="text-xs font-bold text-amber mb-1">نکته‌ی پایانی</div>
                <p className="text-sm text-grey-700 leading-relaxed">{path.final_note}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-10 items-center">
            <button onClick={savePath} className="flex-1 py-3.5 rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal-dark transition-colors">
              ذخیره کن
            </button>
            <button onClick={reset} className="flex-1 py-3.5 rounded-xl bg-white border border-grey-400/40 font-bold text-sm hover:border-teal/50 transition-colors">
              مسیر جدید
            </button>
          </div>
          {saveConfirmed && (
            <div className="text-center text-sm text-teal-dark mt-3 fade-up">
              ✓ ذخیره شد — توی صفحه‌ی اصلی، بخش «مسیرهای ذخیره‌شده» پیداش می‌کنی.
            </div>
          )}
        </section>
      )}

      <footer className="text-center text-xs text-grey-400 pb-10">
        بخشی از <a href="https://abbasramezani.com" className="text-teal-dark">abbasramezani.com</a>
      </footer>
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';

type ArchiveItem = { level: string; topic: string; count: number };

export default function ArchivePage() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/archive')
      .then((r) => r.json())
      .then((data) => setItems(data.items || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen">
      <header className="max-w-2xl mx-auto px-5 pt-10 pb-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="مسیر" width="32" height="32" />
          <span className="font-bold text-lg">مسیر</span>
        </a>
        <span className="text-xs text-grey-500">آرشیو عمومی</span>
      </header>

      <section className="max-w-xl mx-auto px-5 pt-6 pb-20">
        <h1 className="text-2xl font-bold mb-2">آرشیو مسیرهای ساخته‌شده</h1>
        <p className="text-grey-500 text-sm mb-8 leading-relaxed">
          هر مسیری که تا حالا اینجا ساخته شده، بدون نیاز به لاگین یا ذخیره‌ی شخصی. روی هرکدوم بزن، فوری (بدون انتظار) بازش کن.
        </p>

        {loading && <p className="text-sm text-grey-400">در حال بارگذاری...</p>}

        {!loading && items.length === 0 && (
          <p className="text-sm text-grey-400">هنوز چیزی ساخته نشده.</p>
        )}

        <div className="space-y-2">
          {items.map((item, i) => (
            <a
              key={i}
              href={`/?topic=${encodeURIComponent(item.topic)}&level=${encodeURIComponent(item.level)}`}
              className="flex items-center justify-between gap-3 bg-white border border-grey-400/30 rounded-xl px-4 py-3 hover:border-teal/50 transition-colors"
            >
              <span className="text-sm font-medium">{item.topic}</span>
              <span className="text-xs text-grey-400 shrink-0">{item.level}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="text-center text-xs text-grey-400 pb-10">
        بخشی از <a href="https://abbasramezani.com" className="text-teal-dark">abbasramezani.com</a>
      </footer>
    </main>
  );
}

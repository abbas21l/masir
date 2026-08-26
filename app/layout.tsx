import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'مسیر — مسیر یادگیری بساز | عباس رمضانی',
  description: 'برای هر موضوعی که می‌خوای یاد بگیری، یه مسیر یادگیری شفاف و قابل‌اجرا بساز. رایگان، فارسی، بدون نیاز به ثبت‌نام.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

const SITE_URL = 'https://learn.abbasramezani.com';
const TITLE = 'مسیر — مسیر یادگیری بساز | عباس رمضانی';
const DESCRIPTION = 'برای هر موضوعی که می‌خوای یاد بگیری، یه مسیر یادگیری شفاف و قابل‌اجرا بساز. رایگان، فارسی، بدون نیاز به ثبت‌نام.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'مسیر',
    locale: 'fa_IR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: 'مسیر',
      url: SITE_URL,
      description: DESCRIPTION,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'IRR' },
      inLanguage: 'fa',
    },
    {
      '@type': 'Organization',
      name: 'عباس رمضانی',
      url: 'https://abbasramezani.com',
      sameAs: ['https://abbasramezani.com'],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

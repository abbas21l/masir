import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 1800; // 30 min — matches the source's own cache window

export async function GET() {
  try {
    const res = await fetch('https://abbasramezani.com/api_resources.php', {
      next: { revalidate: 1800 },
    });
    if (!res.ok) {
      return NextResponse.json({ items: [] });
    }
    const data = await res.json();
    return NextResponse.json({ items: data.items || [] });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

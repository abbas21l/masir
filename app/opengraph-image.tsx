import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'مسیر — مسیر یادگیری بساز';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FBF9F4',
          position: 'relative',
        }}
      >
        {/* Trail waypoints */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 36 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '5px solid #1A8B7F', display: 'flex' }} />
          <div style={{ width: 60, height: 3, backgroundColor: '#1A8B7F', opacity: 0.4, display: 'flex' }} />
          <div style={{ width: 22, height: 22, borderRadius: '50%', border: '5px solid #1A8B7F', display: 'flex' }} />
          <div style={{ width: 60, height: 3, backgroundColor: '#1A8B7F', opacity: 0.4, display: 'flex' }} />
          <div style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#C98A2C', display: 'flex' }} />
        </div>

        <div style={{ fontSize: 96, fontWeight: 800, color: '#1A1A1A', display: 'flex' }}>مسیر</div>
        <div style={{ fontSize: 34, color: '#6B6B6B', marginTop: 20, display: 'flex' }}>
          مسیر یادگیری‌ت رو با هم می‌سازیم
        </div>
        <div style={{ fontSize: 24, color: '#1A8B7F', marginTop: 40, display: 'flex' }}>
          learn.abbasramezani.com
        </div>
      </div>
    ),
    { ...size }
  );
}

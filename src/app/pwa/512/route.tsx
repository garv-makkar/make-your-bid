import { ImageResponse } from 'next/og';

export function GET() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#214b39', borderRadius: 112 }}>
      <span style={{ color: '#fff9ec', fontFamily: 'Georgia', fontWeight: 700, fontSize: 380, letterSpacing: -45, marginLeft: -32 }}>m</span>
      <span style={{ width: 45, height: 45, borderRadius: 999, background: '#c65b3d', marginTop: 220, marginLeft: -18 }} />
    </div>,
    { width: 512, height: 512 },
  );
}

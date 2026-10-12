import { ImageResponse } from 'next/og';

export function GET() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#214b39', borderRadius: 42 }}>
      <span style={{ color: '#fff9ec', fontFamily: 'Georgia', fontWeight: 700, fontSize: 143, letterSpacing: -17, marginLeft: -12 }}>m</span>
      <span style={{ width: 17, height: 17, borderRadius: 999, background: '#c65b3d', marginTop: 82, marginLeft: -7 }} />
    </div>,
    { width: 192, height: 192 },
  );
}

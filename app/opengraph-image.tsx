import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const alt = 'Primate Trading - Market Analysis & Trading Research';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OGImage() {
  const logoData = await readFile(
    join(process.cwd(), 'public', 'primate-logo.png')
  );
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;

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
          background: '#ffffff',
          position: 'relative',
        }}
      >
        {/* Top blue accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa, #3b82f6, #2563eb)',
          }}
        />

        {/* Logo */}
        <img
          src={logoBase64}
          width={180}
          height={180}
          style={{ objectFit: 'contain', marginBottom: '28px' }}
        />

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: '54px',
            fontWeight: 800,
            color: '#1e3a5f',
            letterSpacing: '-1px',
            marginBottom: '12px',
          }}
        >
          Primate Trading
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: '22px',
            fontWeight: 500,
            color: '#64748b',
          }}
        >
          Market Analysis & Trading Research
        </div>

        {/* Domain badge */}
        <div
          style={{
            display: 'flex',
            marginTop: '28px',
            padding: '10px 28px',
            borderRadius: '999px',
            background: '#eff6ff',
            border: '2px solid #bfdbfe',
            fontSize: '16px',
            fontWeight: 600,
            color: '#2563eb',
            letterSpacing: '0.5px',
          }}
        >
          primatetrading.com
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa, #3b82f6, #2563eb)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}

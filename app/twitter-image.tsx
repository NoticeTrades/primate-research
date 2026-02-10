import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const alt = 'Primate Trading - Market Analysis & Trading Research';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function TwitterImage() {
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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 40%, #1e3a5f 70%, #0a0a0a 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            padding: '20px',
            borderRadius: '24px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <img
            src={logoBase64}
            width={120}
            height={120}
            style={{ objectFit: 'contain' }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '52px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-1px',
            marginBottom: '12px',
          }}
        >
          Primate Trading
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: '22px',
            fontWeight: 400,
            color: '#94a3b8',
          }}
        >
          Market Analysis & Trading Research
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: '28px',
            padding: '8px 24px',
            borderRadius: '999px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            fontSize: '16px',
            fontWeight: 600,
            color: '#60a5fa',
            letterSpacing: '1px',
          }}
        >
          primatetrading.com
        </div>
      </div>
    ),
    { ...size }
  );
}

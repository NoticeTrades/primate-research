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
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 40%, #1e3a5f 70%, #0a0a0a 100%)',
          position: 'relative',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top accent line */}
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

        {/* Logo */}
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
            boxShadow: '0 0 60px rgba(59, 130, 246, 0.15)',
          }}
        >
          <img
            src={logoBase64}
            width={120}
            height={120}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Title */}
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

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: '22px',
            fontWeight: 400,
            color: '#94a3b8',
            letterSpacing: '0.5px',
          }}
        >
          Market Analysis & Trading Research
        </div>

        {/* Domain */}
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


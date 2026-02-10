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
          background: 'linear-gradient(135deg, #030712 0%, #1e293b 25%, #1e3a8a 50%, #1e293b 75%, #030712 100%)',
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
            opacity: 0.06,
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
            height: '6px',
            background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
          }}
        />

        {/* Logo with white background to pop in front */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '32px',
            padding: '24px',
            borderRadius: '28px',
            background: '#ffffff',
            border: '2px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 0 100px rgba(59, 130, 246, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)',
            zIndex: 10,
          }}
        >
          <img
            src={logoBase64}
            width={140}
            height={140}
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
            textShadow: '0 2px 20px rgba(0, 0, 0, 0.5)',
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
            color: '#cbd5e1',
            letterSpacing: '0.5px',
          }}
        >
          Market Analysis & Trading Research
        </div>

        {/* Domain badge */}
        <div
          style={{
            display: 'flex',
            marginTop: '28px',
            padding: '8px 24px',
            borderRadius: '999px',
            background: 'rgba(59, 130, 246, 0.2)',
            border: '1px solid rgba(96, 165, 250, 0.4)',
            fontSize: '16px',
            fontWeight: 600,
            color: '#93c5fd',
            letterSpacing: '1px',
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
            background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
          }}
        />
      </div>
    ),
    { ...size }
  );
}

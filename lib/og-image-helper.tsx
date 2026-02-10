import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const ogSize = { width: 1200, height: 630 };

export async function generatePageOGImage(pageTitle: string, pageSubtitle: string) {
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
          width={140}
          height={140}
          style={{ objectFit: 'contain', marginBottom: '24px' }}
        />

        {/* Brand name */}
        <div
          style={{
            display: 'flex',
            fontSize: '28px',
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Primate Trading
        </div>

        {/* Page title */}
        <div
          style={{
            display: 'flex',
            fontSize: '48px',
            fontWeight: 800,
            color: '#1e3a5f',
            letterSpacing: '-0.5px',
            marginBottom: '12px',
          }}
        >
          {pageTitle}
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: '20px',
            fontWeight: 400,
            color: '#64748b',
            maxWidth: '700px',
            textAlign: 'center',
          }}
        >
          {pageSubtitle}
        </div>

        {/* Domain */}
        <div
          style={{
            display: 'flex',
            marginTop: '28px',
            padding: '8px 24px',
            borderRadius: '999px',
            background: '#eff6ff',
            border: '2px solid #bfdbfe',
            fontSize: '14px',
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
    { ...ogSize }
  );
}


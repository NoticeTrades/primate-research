import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default async function AppleIcon() {
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
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          borderRadius: '36px',
        }}
      >
        <img
          src={logoBase64}
          width={170}
          height={170}
          style={{ 
            objectFit: 'contain',
          }}
        />
      </div>
    ),
    { ...size }
  );
}


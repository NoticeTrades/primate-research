import { generatePageOGImage, ogSize } from '../../lib/og-image-helper';

export const alt = 'Primate Trading - Trades Performance';
export const size = ogSize;
export const contentType = 'image/png';

export default async function TwitterImage() {
  return generatePageOGImage(
    'Trades & Performance',
    'Track live trading performance and verified trade history'
  );
}


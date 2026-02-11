import { generatePageOGImage, ogSize } from '../../lib/og-image-helper';

export const alt = 'Primate Trading - Live Trades';
export const size = ogSize;
export const contentType = 'image/png';

export default async function OGImage() {
  return generatePageOGImage(
    'Live Trades',
    'Track live trading performance and verified trade history'
  );
}


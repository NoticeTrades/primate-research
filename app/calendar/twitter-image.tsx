import { generatePageOGImage, ogSize } from '../../lib/og-image-helper';

export const alt = 'Primate Trading - Market Calendar';
export const size = ogSize;
export const contentType = 'image/png';

export default async function TwitterImage() {
  return generatePageOGImage(
    'Market Calendar',
    'Live economic events, earnings reports & market-moving data with countdowns'
  );
}


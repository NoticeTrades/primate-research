import { generatePageOGImage, ogSize } from '../../lib/og-image-helper';

export const alt = 'Primate Trading - Video Content';
export const size = ogSize;
export const contentType = 'image/png';

export default async function OGImage() {
  return generatePageOGImage(
    'Video Content',
    'Educational trading videos and market analysis breakdowns'
  );
}



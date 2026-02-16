import { generatePageOGImage, ogSize } from '../../lib/og-image-helper';

export const alt = 'Primate Trading - Research Reports';
export const size = ogSize;
export const contentType = 'image/png';

export default async function OGImage() {
  return generatePageOGImage(
    'Research Reports',
    'Comprehensive market analysis and weekly research reports for traders'
  );
}



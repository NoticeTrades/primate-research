import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Video Content',
  description: 'Educational trading videos and market analysis breakdowns. Learn trading strategies, market structure, and technical analysis.',
  openGraph: {
    title: 'Video Content | Primate Trading',
    description: 'Educational trading videos and market analysis breakdowns.',
    type: 'website',
  },
};

export default function VideosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


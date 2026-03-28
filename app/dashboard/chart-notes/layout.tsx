import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Daily Chart Notes / Analysis',
  description: 'Daily chart screenshots and written analysis for each tracked index.',
  openGraph: {
    title: 'Daily Chart Notes / Analysis — Dashboard',
    description: 'Daily chart screenshots and written analysis for each tracked index.',
    type: 'website',
  },
};

export default function ChartNotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}

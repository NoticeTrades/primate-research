import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Research & Market Analysis',
  description: 'Browse our comprehensive library of weekly market outlooks, trading research reports, and market analysis covering equities, crypto, and macroeconomic trends.',
  openGraph: {
    title: 'Research & Market Analysis | Primate Trading',
    description: 'Browse our comprehensive library of weekly market outlooks, trading research reports, and market analysis.',
    type: 'website',
  },
};

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Valuation',
  description:
    'U.S. index ETF valuation: P/E, P/B, earnings yield, and how multiples changed over 1M–YTD — with historical context.',
  openGraph: {
    title: 'Valuation — Dashboard',
    description: 'Index ETF multiples and period changes (FMP-backed when configured).',
    type: 'website',
  },
};

export default function ValuationLayout({ children }: { children: React.ReactNode }) {
  return children;
}

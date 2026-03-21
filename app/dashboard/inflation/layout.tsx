import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inflation (CPI)',
  description: 'US CPI history, year-over-year change, and inflation trend from FRED / BLS.',
  openGraph: {
    title: 'Inflation (CPI) — Dashboard',
    description: 'US CPI history, year-over-year change, and inflation trend.',
    type: 'website',
  },
};

export default function InflationLayout({ children }: { children: React.ReactNode }) {
  return children;
}

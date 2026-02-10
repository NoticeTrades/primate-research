import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Market Calendar',
  description: 'Live economic events, earnings reports & market-moving data with countdowns. Track CPI, NFP, FOMC decisions, and more.',
  openGraph: {
    title: 'Market Calendar | Primate Trading',
    description: 'Live economic events, earnings reports & market-moving data with countdowns.',
    type: 'website',
  },
};

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


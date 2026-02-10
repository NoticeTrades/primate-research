import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trades & Performance',
  description: 'Track live trading performance and verified trade history. See real-time P&L, win rate, and trading statistics.',
  openGraph: {
    title: 'Trades & Performance | Primate Trading',
    description: 'Track live trading performance and verified trade history.',
    type: 'website',
  },
};

export default function TradesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


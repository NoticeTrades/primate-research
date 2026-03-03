import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Trades',
  description: 'Track live trading performance and verified trade history. See real-time P&L, win rate, and trading statistics.',
  openGraph: {
    title: 'Live Trades | Primate Trading',
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


import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Unemployment',
  description: 'U.S. unemployment (U-3, U-6), trends, jobless claims, and model projections from FRED / BLS.',
  openGraph: {
    title: 'Unemployment — Dashboard',
    description: 'U.S. unemployment trends, history, and projections.',
    type: 'website',
  },
};

export default function UnemploymentLayout({ children }: { children: React.ReactNode }) {
  return children;
}

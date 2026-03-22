import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rates & Fed Policy | Dashboard',
  description:
    'FOMC-style rate projections, Treasury yields, fed funds, and curve context from FRED — customizable for traders and investors.',
};

export default function FedPolicyLayout({ children }: { children: React.ReactNode }) {
  return children;
}

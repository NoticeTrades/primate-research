import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started | Dashboard',
  description:
    'How to use the Primate dashboard — indices, CPI, Fed policy, and unemployment — for market context and index futures.',
};

export default function GettingStartedLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';
import DashboardShell from '../components/DashboardShell';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Live index dashboard with market structure, charts, and live trades.',
  openGraph: {
    title: 'Dashboard',
    description: 'Live index dashboard with market structure, charts, and live trades.',
    type: 'website',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}


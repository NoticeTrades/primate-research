import { getLatestContentForHome } from '@/lib/latest-content';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const initialLatestContent = await getLatestContentForHome();
  return <HomeClient initialLatestContent={initialLatestContent} />;
}

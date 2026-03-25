import { NextResponse } from 'next/server';
import { getLatestContentForHome } from '../../../lib/latest-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const payload = await getLatestContentForHome();
  return NextResponse.json(payload);
}

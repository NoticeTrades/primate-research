import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function chartExists(sql: ReturnType<typeof getDb>, chartId: number): Promise<boolean> {
  const r = await sql`SELECT id FROM index_charts WHERE id = ${chartId} LIMIT 1`;
  return r.length > 0;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId: raw } = await params;
    const chartId = Number(raw);
    if (!Number.isInteger(chartId) || chartId < 1) {
      return NextResponse.json({ error: 'Invalid chart id' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    const sql = getDb();
    const countRow = await sql`
      SELECT COUNT(*)::int as c FROM index_chart_likes WHERE chart_id = ${chartId}
    `;
    const likeCount = Number((countRow[0] as { c: number }).c ?? 0);

    let userLiked = false;
    if (userEmail) {
      const u = await sql`
        SELECT id FROM index_chart_likes
        WHERE chart_id = ${chartId} AND user_email = ${userEmail}
        LIMIT 1
      `;
      userLiked = u.length > 0;
    }

    return NextResponse.json({ likeCount, userLiked });
  } catch (error) {
    console.error('chart like GET:', error);
    return NextResponse.json({ error: 'Failed to load likes' }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId: raw } = await params;
    const chartId = Number(raw);
    if (!Number.isInteger(chartId) || chartId < 1) {
      return NextResponse.json({ error: 'Invalid chart id' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    if (!userEmail) {
      return NextResponse.json({ error: 'Sign in to like charts' }, { status: 401 });
    }

    const sql = getDb();
    if (!(await chartExists(sql, chartId))) {
      return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
    }

    const existing = await sql`
      SELECT id FROM index_chart_likes
      WHERE chart_id = ${chartId} AND user_email = ${userEmail}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM index_chart_likes
        WHERE chart_id = ${chartId} AND user_email = ${userEmail}
      `;
    } else {
      await sql`
        INSERT INTO index_chart_likes (chart_id, user_email)
        VALUES (${chartId}, ${userEmail})
      `;
    }

    const countRow = await sql`
      SELECT COUNT(*)::int as c FROM index_chart_likes WHERE chart_id = ${chartId}
    `;
    const likeCount = Number((countRow[0] as { c: number }).c ?? 0);
    const userLiked = existing.length === 0;

    return NextResponse.json({ likeCount, userLiked });
  } catch (error) {
    console.error('chart like POST:', error);
    return NextResponse.json({ error: 'Failed to update like' }, { status: 500 });
  }
}

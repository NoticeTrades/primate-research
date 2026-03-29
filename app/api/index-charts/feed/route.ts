import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_SYMBOLS = ['ES', 'NQ', 'YM', 'RTY', 'CL', 'DXY', 'FTSE', 'GER40', 'DAX'];

type SortMode = 'latest' | 'popular';

function toIntMap(rows: { chart_id: number; cnt: number }[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const r of rows) m.set(r.chart_id, r.cnt);
  return m;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sym = searchParams.get('symbol')?.toUpperCase() || '';
    const sort = (searchParams.get('sort') || 'latest').toLowerCase() as SortMode;
    if (!sym || !VALID_SYMBOLS.includes(sym)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }
    if (sort !== 'latest' && sort !== 'popular') {
      return NextResponse.json({ error: 'Invalid sort (use latest or popular)' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value ?? null;

    const sql = getDb();
    const charts = await sql`
      SELECT id, symbol, chart_url, title, chart_date, sort_order, notes, created_at
      FROM index_charts
      WHERE symbol = ${sym}
      ORDER BY chart_date DESC, sort_order ASC, created_at DESC
    `;

    const list = charts as {
      id: number;
      symbol: string;
      chart_url: string;
      title: string | null;
      chart_date: string;
      sort_order: number;
      notes: string | null;
      created_at: string;
    }[];

    const ids = list.map((c) => c.id);
    if (ids.length === 0) {
      return NextResponse.json({ charts: [], sort });
    }

    const [likeAgg, saveAgg, commentAgg] = await Promise.all([
      sql`
        SELECT chart_id, COUNT(*)::int as cnt
        FROM index_chart_likes
        WHERE chart_id = ANY(${ids})
        GROUP BY chart_id
      `,
      sql`
        SELECT chart_id, COUNT(*)::int as cnt
        FROM index_chart_saves
        WHERE chart_id = ANY(${ids})
        GROUP BY chart_id
      `,
      sql`
        SELECT chart_id, COUNT(*)::int as cnt
        FROM index_chart_comments
        WHERE chart_id = ANY(${ids})
        GROUP BY chart_id
      `,
    ]);

    const likeMap = toIntMap(likeAgg as { chart_id: number; cnt: number }[]);
    const saveMap = toIntMap(saveAgg as { chart_id: number; cnt: number }[]);
    const commentMap = toIntMap(commentAgg as { chart_id: number; cnt: number }[]);

    let userLikedSet = new Set<number>();
    let userSavedSet = new Set<number>();
    if (userEmail) {
      const [likedRows, savedRows] = await Promise.all([
        sql`
          SELECT chart_id FROM index_chart_likes
          WHERE user_email = ${userEmail} AND chart_id = ANY(${ids})
        `,
        sql`
          SELECT chart_id FROM index_chart_saves
          WHERE user_email = ${userEmail} AND chart_id = ANY(${ids})
        `,
      ]);
      userLikedSet = new Set((likedRows as { chart_id: number }[]).map((r) => r.chart_id));
      userSavedSet = new Set((savedRows as { chart_id: number }[]).map((r) => r.chart_id));
    }

    const enriched = list.map((c) => {
      const likeCount = likeMap.get(c.id) ?? 0;
      const saveCount = saveMap.get(c.id) ?? 0;
      const commentCount = commentMap.get(c.id) ?? 0;
      const popularity = likeCount + commentCount + saveCount;
      return {
        ...c,
        likeCount,
        saveCount,
        commentCount,
        popularity,
        userLiked: userLikedSet.has(c.id),
        userSaved: userSavedSet.has(c.id),
      };
    });

    if (sort === 'popular') {
      enriched.sort((a, b) => {
        if (b.popularity !== a.popularity) return b.popularity - a.popularity;
        const da = new Date(a.chart_date).getTime();
        const db = new Date(b.chart_date).getTime();
        if (db !== da) return db - da;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return NextResponse.json({
      sort,
      charts: enriched.map(({ popularity: _p, ...rest }) => rest),
    });
  } catch (error) {
    console.error('index-charts feed error:', error);
    return NextResponse.json({ error: 'Failed to load chart feed' }, { status: 500 });
  }
}

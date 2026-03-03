import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/research/likes - Get like counts for all research articles
export async function GET() {
  try {
    const sql = getDb();

    const rows = await sql`
      SELECT article_slug, COUNT(*) as count
      FROM research_likes
      GROUP BY article_slug
    `;

    const counts: Record<string, number> = {};
    for (const row of rows as { article_slug: string; count: string }[]) {
      counts[row.article_slug] = parseInt(String(row.count), 10);
    }

    return NextResponse.json(counts);
  } catch (error: unknown) {
    console.error('Get research likes counts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get like counts' },
      { status: 500 }
    );
  }
}

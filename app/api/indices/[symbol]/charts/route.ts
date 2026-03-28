import { NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Allow fetching charts for any index symbol we support in the main indices endpoint.
// If the DB has no rows for a given symbol, this will simply return an empty list.
const VALID_SYMBOLS = ['ES', 'NQ', 'YM', 'RTY', 'CL', 'DXY', 'FTSE', 'GER40', 'DAX'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const sym = symbol?.toUpperCase();
    if (!sym || !VALID_SYMBOLS.includes(sym)) {
      return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });
    }

    const sql = getDb();
    const charts = await sql`
      SELECT id, symbol, chart_url, title, chart_date, sort_order, notes, created_at
      FROM index_charts
      WHERE symbol = ${sym}
      ORDER BY chart_date DESC, sort_order ASC, created_at DESC
    `;

    return NextResponse.json({ charts });
  } catch (error) {
    console.error('Index charts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch charts' },
      { status: 500 }
    );
  }
}

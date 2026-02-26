import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/trades — list all live trades (open first, then closed)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const openOnly = searchParams.get('open_only') === 'true';

    const sql = getDb();
    let rows;
    if (openOnly) {
      rows = await sql`
        SELECT id, symbol, side, quantity, entry_price, exit_quantity, exit_price, chart_url, notes, created_at, updated_at
        FROM live_trades
        WHERE exit_quantity < quantity
        ORDER BY created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT id, symbol, side, quantity, entry_price, exit_quantity, exit_price, chart_url, notes, created_at, updated_at
        FROM live_trades
        ORDER BY (CASE WHEN exit_quantity < quantity THEN 0 ELSE 1 END), created_at DESC
      `;
    }

    const trades = (rows as Array<{ id: number; symbol: string; side: string; quantity: number; entry_price: string | number; exit_quantity?: number | null; exit_price?: string | number | null; chart_url?: string | null; notes?: string | null; created_at: string; updated_at: string }>).map((r) => ({
      id: r.id,
      symbol: r.symbol,
      side: r.side,
      quantity: r.quantity,
      entryPrice: Number(r.entry_price),
      exitQuantity: r.exit_quantity ?? 0,
      exitPrice: r.exit_price != null ? Number(r.exit_price) : null,
      chartUrl: r.chart_url,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      status: (r.exit_quantity ?? 0) < r.quantity ? 'open' : 'closed',
    }));

    return NextResponse.json({ trades });
  } catch (error) {
    console.error('GET /api/trades error:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

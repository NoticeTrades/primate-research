import { NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/trades/[id] — update a live trade (partial exit, full exit, add notes/chart)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: 'Invalid trade id' }, { status: 400 });
    }

    const body = await request.json();
    const { secret, quantity, entry_price, exit_quantity, exit_price, chart_url, notes } = body;

    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const existing = await sql`
      SELECT id, symbol, side, quantity, entry_price, exit_quantity, exit_price, chart_url, notes
      FROM live_trades WHERE id = ${id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    const row = existing[0];
    const currentQty = row.quantity;
    const currentExitQty = row.exit_quantity ?? 0;
    const currentExitPrice = row.exit_price != null ? Number(row.exit_price) : null;

    let newQuantity = currentQty;
    let newEntryPrice = Number(row.entry_price);
    let newExitQuantity = currentExitQty;
    let newExitPrice = currentExitPrice;

    if (typeof quantity === 'number' && quantity >= 1) {
      newQuantity = quantity;
    }
    if (typeof entry_price === 'number' && entry_price > 0) {
      newEntryPrice = entry_price;
    }
    if (typeof exit_quantity === 'number' && exit_quantity >= 0 && exit_quantity <= newQuantity) {
      newExitQuantity = exit_quantity;
    }
    if (typeof exit_price === 'number' && exit_price > 0) {
      newExitPrice = exit_price;
    }

    await sql`
      UPDATE live_trades
      SET quantity = ${newQuantity}, entry_price = ${newEntryPrice},
          exit_quantity = ${newExitQuantity}, exit_price = ${newExitPrice},
          chart_url = ${chart_url !== undefined ? chart_url : row.chart_url},
          notes = ${notes !== undefined ? notes : row.notes},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    const updated = await sql`
      SELECT id, symbol, side, quantity, entry_price, exit_quantity, exit_price, chart_url, notes, updated_at
      FROM live_trades WHERE id = ${id}
    `;
    const u = updated[0];
    return NextResponse.json({
      success: true,
      trade: {
        id: u.id,
        symbol: u.symbol,
        side: u.side,
        quantity: u.quantity,
        entryPrice: Number(u.entry_price),
        exitQuantity: u.exit_quantity ?? 0,
        exitPrice: u.exit_price != null ? Number(u.exit_price) : null,
        chartUrl: u.chart_url,
        notes: u.notes,
        updatedAt: u.updated_at,
        status: (u.exit_quantity ?? 0) < u.quantity ? 'open' : 'closed',
      },
    });
  } catch (error) {
    console.error('PATCH /api/admin/trades/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/trades/[id] — delete a trade (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: 'Invalid trade id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const secret = body.secret || new URL(request.url).searchParams.get('secret');
    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    await sql`DELETE FROM live_trades WHERE id = ${id}`;
    return NextResponse.json({ success: true, message: 'Trade deleted' });
  } catch (error) {
    console.error('DELETE /api/admin/trades/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

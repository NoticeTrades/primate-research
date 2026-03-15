import { NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';
import { Resend } from 'resend';
import { getEmailLogoHtml } from '../../../../../lib/email-logo';

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
    const { secret, quantity, entry_price, exit_quantity, exit_price, chart_url, notes, stop_loss, take_profit } = body;

    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const existing = await sql`
      SELECT id, symbol, side, quantity, entry_price, exit_quantity, exit_price, chart_url, notes, stop_loss, take_profit
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

    const newStopLoss = stop_loss === undefined ? (row.stop_loss != null ? Number(row.stop_loss) : null) : (stop_loss === null || stop_loss === '' ? null : (() => { const n = parseFloat(stop_loss); return Number.isFinite(n) ? n : null; })());
    const newTakeProfit = take_profit === undefined ? (row.take_profit != null ? Number(row.take_profit) : null) : (take_profit === null || take_profit === '' ? null : (() => { const n = parseFloat(take_profit); return Number.isFinite(n) ? n : null; })());
    await sql`
      UPDATE live_trades
      SET quantity = ${newQuantity}, entry_price = ${newEntryPrice},
          exit_quantity = ${newExitQuantity}, exit_price = ${newExitPrice},
          chart_url = ${chart_url !== undefined ? chart_url : row.chart_url},
          notes = ${notes !== undefined ? notes : row.notes},
          stop_loss = ${newStopLoss},
          take_profit = ${newTakeProfit},
          updated_at = NOW()
      WHERE id = ${id}
    `;

    // Bell notification + email to trade-notification subscribers when trade is closed or partially closed
    const wasOpen = (currentExitQty ?? 0) < currentQty;
    const nowClosed = newExitQuantity >= newQuantity;
    const partialExit = newExitQuantity > (currentExitQty ?? 0) && newExitQuantity < newQuantity;
    if (wasOpen && (nowClosed || partialExit)) {
      const sym = row.symbol;
      const side = row.side;
      const priceStr = newExitPrice != null ? Number(newExitPrice).toFixed(2) : '—';
      const title = nowClosed ? `${sym} ${side} closed` : `${sym} ${side} partial exit`;
      const description = nowClosed
        ? `Position closed: ${newQuantity} @ ${priceStr}.`
        : `${newExitQuantity} of ${newQuantity} closed @ ${priceStr}. View Live Trades for details.`;
      await sql`
        INSERT INTO notifications (title, description, link, type)
        VALUES (${title}, ${description}, '/trades', 'trade')
      `;

      // Email users who have trade notifications enabled (same as new-trade flow)
      if (process.env.RESEND_API_KEY) {
        const users = await sql`
          SELECT email, name FROM users
          WHERE verified = true AND trade_notifications_email = true
        `;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://primatetrading.com';
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Primate Research <notifications@resend.dev>';
        const resend = new Resend(process.env.RESEND_API_KEY);
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #fafafa; padding: 40px 24px; border-radius: 16px;">
            ${getEmailLogoHtml(siteUrl)}
            <div style="text-align: center; margin-bottom: 28px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #fafafa; margin: 0;">Primate Research</h1>
            </div>
            <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
              <p style="color: #f59e0b; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px 0;">Trade update</p>
              <h2 style="font-size: 22px; font-weight: 700; color: #fafafa; margin: 0 0 8px 0; letter-spacing: -0.02em;">${title}</h2>
              <p style="font-size: 14px; color: #a1a1aa; margin: 0;">${description}</p>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${siteUrl}/trades" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px;">View live trades</a>
            </div>
            <div style="border-top: 1px solid #27272a; padding-top: 16px; text-align: center;">
              <p style="font-size: 12px; color: #52525b; margin: 0;">You received this because you enabled trade email notifications.</p>
            </div>
          </div>
        `;
        for (const user of users) {
          try {
            await resend.emails.send({ from: fromEmail, to: user.email, subject: `Trade update: ${title}`, html: emailHtml });
          } catch {
            // skip
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    const updated = await sql`
      SELECT id, symbol, side, quantity, entry_price, exit_quantity, exit_price, chart_url, notes, stop_loss, take_profit, updated_at
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
        stopLoss: u.stop_loss != null ? Number(u.stop_loss) : null,
        takeProfit: u.take_profit != null ? Number(u.take_profit) : null,
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

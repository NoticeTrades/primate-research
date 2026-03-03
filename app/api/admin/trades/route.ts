import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { Resend } from 'resend';
import { getEmailLogoHtml } from '../../../../lib/email-logo';

export const dynamic = 'force-dynamic';

// POST /api/admin/trades — add a new live trade (admin only), create bell notification, optionally email opt-in users
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, symbol, side, quantity, entry_price, chart_url, notes, send_notification_email } = body;

    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sym = (symbol || '').toUpperCase();
    const sid = (side || '').toLowerCase();
    if (!['NQ', 'ES', 'MNQ', 'MES'].includes(sym)) {
      return NextResponse.json({ error: 'Invalid symbol. Use NQ, ES, MNQ, or MES.' }, { status: 400 });
    }
    if (sid !== 'long' && sid !== 'short') {
      return NextResponse.json({ error: 'Invalid side. Use long or short.' }, { status: 400 });
    }
    const qty = parseInt(quantity, 10);
    const entry = parseFloat(entry_price);
    if (!Number.isInteger(qty) || qty < 1 || !Number.isFinite(entry) || entry <= 0) {
      return NextResponse.json({ error: 'Invalid quantity or entry_price.' }, { status: 400 });
    }

    const sql = getDb();
    const inserted = await sql`
      INSERT INTO live_trades (symbol, side, quantity, entry_price, chart_url, notes)
      VALUES (${sym}, ${sid}, ${qty}, ${entry}, ${chart_url || null}, ${notes || null})
      RETURNING id, symbol, side, quantity, entry_price, created_at
    `;
    const row = inserted[0];
    const tradeId = row.id;

    const title = `New ${sid} ${sym}: ${qty} @ ${Number(row.entry_price).toFixed(2)}`;
    const description = notes ? `${notes.slice(0, 120)}${notes.length > 120 ? '…' : ''}` : `Nick entered a ${sid} position on ${sym}.`;
    const link = '/trades';

    await sql`
      INSERT INTO notifications (title, description, link, type)
      VALUES (${title}, ${description || null}, ${link}, 'trade')
    `;

    let emailSent = 0;
    const sendEmail = send_notification_email !== false && process.env.RESEND_API_KEY;
    if (sendEmail) {
      const users = await sql`
        SELECT email, name FROM users
        WHERE verified = true AND trade_notifications_email = true
      `;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://primate-research.vercel.app';
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'Primate Research <notifications@resend.dev>';
      const resend = new Resend(process.env.RESEND_API_KEY);
      const notesHtml = notes && notes.trim()
        ? `<div style="background-color: #18181b; border: 1px solid #22c55e33; border-radius: 12px; padding: 20px; margin: 16px 0; border-left: 4px solid #22c55e;">
            <p style="color: #22c55e; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px 0;">Notes / reasoning</p>
            <p style="font-size: 14px; color: #e4e4e7; line-height: 1.6; margin: 0; white-space: pre-wrap;">${notes.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>`
        : '';
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #09090b; color: #fafafa; padding: 40px 24px; border-radius: 16px;">
          ${getEmailLogoHtml(siteUrl)}
          <div style="text-align: center; margin-bottom: 28px;">
            <h1 style="font-size: 20px; font-weight: 700; color: #fafafa; margin: 0;">Primate Research</h1>
          </div>
          <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 16px;">
            <p style="color: #22c55e; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px 0;">New live trade</p>
            <h2 style="font-size: 22px; font-weight: 700; color: #fafafa; margin: 0 0 8px 0; letter-spacing: -0.02em;">${title}</h2>
            <p style="font-size: 14px; color: #a1a1aa; margin: 0;">View real-time P&L and updates on the Live Trades page.</p>
          </div>
          ${notesHtml}
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
          await resend.emails.send({ from: fromEmail, to: user.email, subject: `Live Trade: ${title}`, html: emailHtml });
          emailSent++;
        } catch {
          // skip
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    return NextResponse.json({
      success: true,
      trade: {
        id: tradeId,
        symbol: row.symbol,
        side: row.side,
        quantity: row.quantity,
        entryPrice: Number(row.entry_price),
        createdAt: row.created_at,
      },
      notificationCreated: true,
      emailSent: sendEmail ? emailSent : undefined,
    });
  } catch (error) {
    console.error('POST /api/admin/trades error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

const VALID_SYMBOLS = ['ES', 'NQ', 'YM', 'RTY', 'CL', 'DXY', 'FTSE', 'GER40', 'DAX'];

function isAdminAuth(request: Request, body?: { secret?: string }): boolean {
  const urlSecret = new URL(request.url).searchParams.get('secret');
  const bodySecret = body?.secret;
  const secret = urlSecret || bodySecret;
  return !!process.env.NOTIFY_SECRET && secret === process.env.NOTIFY_SECRET;
}

// GET — list all index charts (admin)
export async function GET(request: Request) {
  try {
    if (!isAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol')?.toUpperCase();

    const sql = getDb();
    let charts;
    if (symbol && VALID_SYMBOLS.includes(symbol)) {
      charts = await sql`
        SELECT id, symbol, chart_url, title, chart_date, sort_order, notes, created_at
        FROM index_charts
        WHERE symbol = ${symbol}
        ORDER BY chart_date DESC, sort_order ASC, created_at DESC
      `;
    } else {
      charts = await sql`
        SELECT id, symbol, chart_url, title, chart_date, sort_order, notes, created_at
        FROM index_charts
        ORDER BY symbol, chart_date DESC, sort_order ASC, created_at DESC
      `;
    }
    return NextResponse.json({ charts });
  } catch (error) {
    console.error('Admin index charts list error:', error);
    return NextResponse.json(
      { error: 'Failed to list charts' },
      { status: 500 }
    );
  }
}

// POST — add chart (admin): multipart form with file, symbol, title, chart_date, secret
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const secret = formData.get('secret') as string | null;
    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const file = formData.get('file') as File | null;
    const symbolRaw = (formData.get('symbol') as string)?.toUpperCase();
    const title = (formData.get('title') as string)?.trim() || null;
    const chartDate = (formData.get('chart_date') as string)?.trim() || null;
    const notesRaw = formData.get('notes') as string | null;
    const notes =
      notesRaw != null && String(notesRaw).trim() !== '' ? String(notesRaw).trim() : null;

    const replaceRaw = formData.get('replace_chart_id');
    const replaceId =
      replaceRaw != null && String(replaceRaw).trim() !== ''
        ? Number(replaceRaw)
        : NaN;

    if (!file) {
      return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!file.type || !allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Image too large. Max 10MB.' },
        { status: 400 }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Blob storage not configured (BLOB_READ_WRITE_TOKEN)' },
        { status: 500 }
      );
    }

    const sql = getDb();
    const dateVal = chartDate?.trim() || null;

    // Replace image + optional metadata on an existing row (admin edit)
    if (Number.isInteger(replaceId) && replaceId > 0) {
      const existingRows = await sql`
        SELECT id, symbol, title, chart_date, notes FROM index_charts WHERE id = ${replaceId}
      `;
      if (!existingRows.length) {
        return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
      }
      const cur = existingRows[0] as {
        symbol: string;
        title: string | null;
        chart_date: string | null;
        notes: string | null;
      };
      const rowSymbol = cur.symbol;

      const hasTitleField = formData.has('title');
      const nextTitle = hasTitleField
        ? ((formData.get('title') as string)?.trim() || null)
        : cur.title;

      const hasNotesField = formData.has('notes');
      const nextNotes = hasNotesField
        ? (String(formData.get('notes')).trim() || null)
        : cur.notes;

      let nextDateVal: string | null;
      if (formData.has('chart_date')) {
        const d = (formData.get('chart_date') as string)?.trim();
        nextDateVal = d && d.length > 0 ? d : null;
      } else if (cur.chart_date != null) {
        const s = String(cur.chart_date);
        nextDateVal = s.length >= 10 ? s.slice(0, 10) : s;
      } else {
        nextDateVal = null;
      }

      const timestamp = Date.now();
      const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const blobPath = `index-charts/${rowSymbol}/${timestamp}-${sanitized}`;

      const blob = await put(blobPath, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      const [updated] = await sql`
        UPDATE index_charts
        SET chart_url = ${blob.url},
            title = ${nextTitle},
            chart_date = ${nextDateVal}::date,
            notes = ${nextNotes}
        WHERE id = ${replaceId}
        RETURNING id, symbol, chart_url, title, chart_date, notes, created_at
      `;

      return NextResponse.json({ success: true, chart: updated });
    }

    // New chart row
    const symbol = symbolRaw;
    if (!symbol || !VALID_SYMBOLS.includes(symbol)) {
      return NextResponse.json(
        { error: `Missing or invalid symbol (${VALID_SYMBOLS.join(', ')})` },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobPath = `index-charts/${symbol}/${timestamp}-${sanitized}`;

    const blob = await put(blobPath, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const [inserted] = dateVal
      ? await sql`
          INSERT INTO index_charts (symbol, chart_url, title, chart_date, sort_order, notes)
          VALUES (${symbol}, ${blob.url}, ${title}, ${dateVal}::date, 0, ${notes})
          RETURNING id, symbol, chart_url, title, chart_date, notes, created_at
        `
      : await sql`
          INSERT INTO index_charts (symbol, chart_url, title, sort_order, notes)
          VALUES (${symbol}, ${blob.url}, ${title}, 0, ${notes})
          RETURNING id, symbol, chart_url, title, chart_date, notes, created_at
        `;

    return NextResponse.json({
      success: true,
      chart: inserted,
    });
  } catch (error) {
    console.error('Admin index chart upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}

// DELETE — remove chart by id (admin)
export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!isAdminAuth(request, body)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = body.id != null ? Number(body.id) : NaN;
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: 'Invalid chart id' }, { status: 400 });
    }

    const sql = getDb();
    await sql`DELETE FROM index_charts WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin index chart delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete chart' },
      { status: 500 }
    );
  }
}

// PATCH — update title, chart_date, notes (no image change)
export async function PATCH(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      secret?: string;
      id?: number;
      title?: string | null;
      chart_date?: string | null;
      notes?: string | null;
    } | null;

    if (!body || !isAdminAuth(request, { secret: body.secret })) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = body.id != null ? Number(body.id) : NaN;
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: 'Invalid chart id' }, { status: 400 });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT id, title, chart_date, notes FROM index_charts WHERE id = ${id}
    `;
    if (!rows.length) {
      return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
    }

    const cur = rows[0] as {
      title: string | null;
      chart_date: string | null;
      notes: string | null;
    };

    const nextTitle =
      body.title !== undefined ? (body.title == null ? null : String(body.title).trim() || null) : cur.title;
    const nextNotes =
      body.notes !== undefined ? (body.notes == null ? null : String(body.notes).trim() || null) : cur.notes;

    let nextDate: string | null;
    if (body.chart_date !== undefined) {
      const d = body.chart_date?.trim();
      nextDate = d && d.length > 0 ? d : null;
    } else if (cur.chart_date != null) {
      const s = String(cur.chart_date);
      nextDate = s.length >= 10 ? s.slice(0, 10) : s;
    } else {
      nextDate = null;
    }

    const [updated] = await sql`
      UPDATE index_charts
      SET title = ${nextTitle},
          chart_date = ${nextDate}::date,
          notes = ${nextNotes}
      WHERE id = ${id}
      RETURNING id, symbol, chart_url, title, chart_date, notes, created_at
    `;

    return NextResponse.json({ success: true, chart: updated });
  } catch (error) {
    console.error('Admin index chart patch error:', error);
    return NextResponse.json(
      { error: 'Failed to update chart' },
      { status: 500 }
    );
  }
}

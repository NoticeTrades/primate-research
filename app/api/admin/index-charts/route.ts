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
        SELECT id, symbol, chart_url, title, chart_date, sort_order, created_at
        FROM index_charts
        WHERE symbol = ${symbol}
        ORDER BY chart_date DESC, sort_order ASC, created_at DESC
      `;
    } else {
      charts = await sql`
        SELECT id, symbol, chart_url, title, chart_date, sort_order, created_at
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
    const symbol = (formData.get('symbol') as string)?.toUpperCase();
    const title = (formData.get('title') as string)?.trim() || null;
    const chartDate = (formData.get('chart_date') as string)?.trim() || null;

    if (!file || !symbol || !VALID_SYMBOLS.includes(symbol)) {
      return NextResponse.json(
        { error: `Missing file or invalid symbol (${VALID_SYMBOLS.join(', ')})` },
        { status: 400 }
      );
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

    const timestamp = Date.now();
    const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobPath = `index-charts/${symbol}/${timestamp}-${sanitized}`;

    const blob = await put(blobPath, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const sql = getDb();
    const dateVal = chartDate?.trim() || null;

    const [inserted] = dateVal
      ? await sql`
          INSERT INTO index_charts (symbol, chart_url, title, chart_date, sort_order)
          VALUES (${symbol}, ${blob.url}, ${title}, ${dateVal}::date, 0)
          RETURNING id, symbol, chart_url, title, chart_date, created_at
        `
      : await sql`
          INSERT INTO index_charts (symbol, chart_url, title, sort_order)
          VALUES (${symbol}, ${blob.url}, ${title}, 0)
          RETURNING id, symbol, chart_url, title, chart_date, created_at
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

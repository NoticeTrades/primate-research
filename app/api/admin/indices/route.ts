import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const structures = await sql`
      SELECT symbol, daily_structure, weekly_structure, monthly_structure, updated_at
      FROM index_market_structure
      ORDER BY symbol
    `;

    return NextResponse.json({ structures });
  } catch (error) {
    console.error('Error fetching index structures:', error);
    return NextResponse.json({ error: 'Failed to fetch structures' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, symbol, daily, weekly, monthly } = body;

    if (secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!symbol || !daily || !weekly) {
      return NextResponse.json({ error: 'Symbol, daily, and weekly are required' }, { status: 400 });
    }

    const sql = getDb();
    const sym = symbol.toUpperCase();

    // Upsert market structure
    await sql`
      INSERT INTO index_market_structure (symbol, daily_structure, weekly_structure, monthly_structure, updated_at)
      VALUES (${sym}, ${daily}, ${weekly}, ${monthly || null}, NOW())
      ON CONFLICT (symbol) 
      DO UPDATE SET 
        daily_structure = EXCLUDED.daily_structure,
        weekly_structure = EXCLUDED.weekly_structure,
        monthly_structure = EXCLUDED.monthly_structure,
        updated_at = NOW()
    `;

    // Bell notification for all users: market structure updated
    const indexName = sym === 'ES' ? 'E-mini S&P 500' : sym === 'NQ' ? 'E-mini NASDAQ-100' : sym === 'YM' ? 'E-mini Dow' : sym;
    await sql`
      INSERT INTO notifications (title, description, link, type)
      VALUES (
        ${`Market structure updated: ${sym}`},
        ${`${indexName} (${sym}) daily/weekly structure has been updated. View the ${sym} page for details.`},
        ${`/indices/${sym}`},
        'update'
      )
    `;

    return NextResponse.json({ success: true, message: 'Market structure updated' });
  } catch (error) {
    console.error('Error updating market structure:', error);
    return NextResponse.json({ error: 'Failed to update structure' }, { status: 500 });
  }
}


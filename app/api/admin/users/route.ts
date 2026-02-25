import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export async function GET(request: Request) {
  try {
    // Protect with admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const users = await sql`
      SELECT id, name, email, username, created_at
      FROM users
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ users, total: users.length });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



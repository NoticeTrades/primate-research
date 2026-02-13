import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/admin/feedback — list all feedback (admin view)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const feedback = await sql`
      SELECT id, user_email, username, category, message, created_at
      FROM feedback
      ORDER BY created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('List feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/feedback — delete all feedback
export async function DELETE(request: Request) {
  try {
    const { secret } = await request.json();

    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    await sql`DELETE FROM feedback`;

    return NextResponse.json({ success: true, message: 'All feedback deleted' });
  } catch (error) {
    console.error('Delete feedback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



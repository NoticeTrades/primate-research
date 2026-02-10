import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';

// POST /api/admin/notifications — create a new notification (shows in bell for all users)
export async function POST(request: Request) {
  try {
    const { title, description, link, type, secret } = await request.json();

    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const sql = getDb();

    await sql`
      INSERT INTO notifications (title, description, link, type)
      VALUES (${title}, ${description || null}, ${link || null}, ${type || 'update'})
    `;

    return NextResponse.json({ success: true, message: 'Notification created' });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/admin/notifications — list all notifications (admin view)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const notifications = await sql`
      SELECT id, title, description, link, type, created_at
      FROM notifications
      ORDER BY created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('List notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/notifications — delete all notifications
export async function DELETE(request: Request) {
  try {
    const { secret } = await request.json();

    if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const result = await sql`DELETE FROM notifications`;
    const deleted = result.count ?? 0;

    return NextResponse.json({ success: true, message: `Deleted ${deleted} notification(s)` });
  } catch (error) {
    console.error('Delete notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



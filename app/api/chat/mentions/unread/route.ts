import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../lib/db';

// GET /api/chat/mentions/unread — returns unread mention count per room for the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();

    // Get all rooms (Neon returns Record<string, unknown>[])
    const rooms = await sql`
      SELECT id FROM chat_rooms WHERE is_active = true
    `;
    const roomIds = (rooms as { id: number }[]).map((r) => r.id);

    // Get last_read_at per room for this user
    const readRows = await sql`
      SELECT room_id, last_read_at FROM chat_room_read WHERE user_email = ${userEmail}
    `;
    const lastReadByRoom: Record<number, string> = {};
    (readRows as { room_id: number; last_read_at: string }[]).forEach((row) => {
      lastReadByRoom[row.room_id] = row.last_read_at;
    });

    // Get all unread chat_mention notifications for this user (link like /chat?room=X)
    const notifications = await sql`
      SELECT id, link, created_at
      FROM notifications
      WHERE user_email = ${userEmail}
        AND type = 'chat_mention'
      ORDER BY created_at DESC
    `;

    // Build count per room: only count if created_at > last_read_at for that room
    const countByRoom: Record<string, number> = {};
    roomIds.forEach((id: number) => {
      countByRoom[String(id)] = 0;
    });

    for (const n of notifications) {
      const match = (n.link || '').match(/[?&]room=(\d+)/);
      if (!match) continue;
      const roomId = match[1];
      const lastRead = lastReadByRoom[parseInt(roomId, 10)];
      if (lastRead && new Date(n.created_at) <= new Date(lastRead)) continue;
      countByRoom[roomId] = (countByRoom[roomId] || 0) + 1;
    }

    return NextResponse.json({ byRoom: countByRoom });
  } catch (error) {
    console.error('Error fetching chat mention unread counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread counts' },
      { status: 500 }
    );
  }
}

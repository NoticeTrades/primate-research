import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../lib/db';

// GET /api/chat/messages/unread — returns unread message count per room for the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();

    // Get all active rooms
    const rooms = await sql`
      SELECT id FROM chat_rooms WHERE is_active = true
    `;
    const roomIds = (rooms as { id: number }[]).map((r) => r.id);

    if (roomIds.length === 0) {
      return NextResponse.json({ byRoom: {} });
    }

    // Get last_read_at per room for this user
    const readRows = await sql`
      SELECT room_id, last_read_at FROM chat_room_read WHERE user_email = ${userEmail}
    `;
    const lastReadByRoom: Record<number, string> = {};
    (readRows as { room_id: number; last_read_at: string }[]).forEach((row) => {
      lastReadByRoom[row.room_id] = row.last_read_at;
    });

    // Count unread messages per room (messages created after last_read_at, excluding user's own messages)
    const countByRoom: Record<string, number> = {};
    
    for (const roomId of roomIds) {
      const lastRead = lastReadByRoom[roomId];
      
      if (lastRead) {
        // Count messages created after last_read_at that are not from the current user
        const result = await sql`
          SELECT COUNT(*) as count
          FROM chat_messages
          WHERE room_id = ${roomId}
            AND user_email != ${userEmail}
            AND created_at > ${lastRead}
        `;
        countByRoom[String(roomId)] = parseInt((result[0] as { count: string }).count, 10) || 0;
      } else {
        // If user has never read this room, count all messages except their own
        const result = await sql`
          SELECT COUNT(*) as count
          FROM chat_messages
          WHERE room_id = ${roomId}
            AND user_email != ${userEmail}
        `;
        countByRoom[String(roomId)] = parseInt((result[0] as { count: string }).count, 10) || 0;
      }
    }

    return NextResponse.json({ byRoom: countByRoom });
  } catch (error) {
    console.error('Error fetching chat unread message counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread counts' },
      { status: 500 }
    );
  }
}


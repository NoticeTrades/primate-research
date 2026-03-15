import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../../lib/db';

// POST /api/chat/rooms/[roomId]/read — mark room as read for the current user (clears channel mention badge)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomIdNum = parseInt(roomId, 10);
    if (isNaN(roomIdNum)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    const sql = getDb();

    // Upsert chat_room_read so unread count for this room becomes 0
    await sql`
      INSERT INTO chat_room_read (user_email, room_id, last_read_at)
      VALUES (${userEmail}, ${roomIdNum}, NOW())
      ON CONFLICT (user_email, room_id)
      DO UPDATE SET last_read_at = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error marking chat room as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark room as read' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../../../../lib/db';

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '🔥', '👎'];

// POST /api/chat/rooms/[roomId]/messages/[messageId]/react — toggle reaction (body: { emoji: '👍' })
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string; messageId: string }> }
) {
  try {
    const { roomId, messageId } = await params;
    const roomIdNum = parseInt(roomId, 10);
    const messageIdNum = parseInt(messageId, 10);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isNaN(roomIdNum) || isNaN(messageIdNum)) {
      return NextResponse.json({ error: 'Invalid room or message ID' }, { status: 400 });
    }

    const body = await request.json();
    const emoji = typeof body.emoji === 'string' ? body.emoji.trim() : '';
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json(
        { error: 'Invalid emoji. Allowed: ' + ALLOWED_EMOJIS.join(', ') },
        { status: 400 }
      );
    }

    const sql = getDb();

    const message = await sql`
      SELECT id FROM chat_messages WHERE id = ${messageIdNum} AND room_id = ${roomIdNum}
    `;
    if (message.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const existing = await sql`
      SELECT id FROM chat_message_reactions
      WHERE message_id = ${messageIdNum} AND user_email = ${userEmail} AND emoji = ${emoji}
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM chat_message_reactions
        WHERE message_id = ${messageIdNum} AND user_email = ${userEmail} AND emoji = ${emoji}
      `;
    } else {
      await sql`
        INSERT INTO chat_message_reactions (message_id, user_email, emoji)
        VALUES (${messageIdNum}, ${userEmail}, ${emoji})
      `;
    }

    const reactions = await sql`
      SELECT emoji, user_email FROM chat_message_reactions WHERE message_id = ${messageIdNum}
    `;
    const countByEmoji: Record<string, { count: number; reacted: boolean }> = {};
    (reactions as { emoji: string; user_email: string }[]).forEach((r) => {
      if (!countByEmoji[r.emoji]) countByEmoji[r.emoji] = { count: 0, reacted: false };
      countByEmoji[r.emoji].count += 1;
      if (r.user_email === userEmail) countByEmoji[r.emoji].reacted = true;
    });
    const reactionList = Object.entries(countByEmoji).map(([emoji, v]) => ({
      emoji,
      count: v.count,
      reacted: v.reacted,
    }));

    return NextResponse.json({ reactions: reactionList });
  } catch (error) {
    console.error('React to message error:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}

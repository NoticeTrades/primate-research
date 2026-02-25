import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../../../lib/db';

export const dynamic = 'force-dynamic';

// DELETE /api/chat/rooms/[roomId]/messages/[messageId] - Delete a chat message
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string; messageId: string }> }
) {
  try {
    const { roomId, messageId } = await params;
    const roomIdNum = parseInt(roomId);
    const messageIdNum = parseInt(messageId);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (isNaN(roomIdNum) || isNaN(messageIdNum)) {
      return NextResponse.json({ error: 'Invalid room or message ID' }, { status: 400 });
    }

    const sql = getDb();

    // Get user info to check if they're a moderator
    const users = await sql`
      SELECT username, user_role
      FROM users
      WHERE email = ${userEmail}
      LIMIT 1
    `;

    const currentUser = users[0];
    const isModerator = currentUser?.username === 'noticetrades' || currentUser?.user_role === 'owner';

    // Verify the message exists
    const message = await sql`
      SELECT id, user_email, room_id
      FROM chat_messages
      WHERE id = ${messageIdNum} AND room_id = ${roomIdNum}
      LIMIT 1
    `;

    if (message.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check permissions: moderators can delete any message, users can only delete their own
    if (!isModerator && message[0].user_email !== userEmail) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      );
    }

    // Delete the message (CASCADE will delete associated files automatically)
    await sql`
      DELETE FROM chat_messages
      WHERE id = ${messageIdNum}
    `;

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Delete chat message error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}


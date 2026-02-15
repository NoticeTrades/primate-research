import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/chat/dms — list DM conversations for current user (with other user + last message)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();

    const myDms = await sql`
      SELECT dm_id FROM dm_participants WHERE user_email = ${userEmail}
    `;
    const dmIds = (myDms as { dm_id: number }[]).map((r) => r.dm_id);
    if (dmIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const participants = await sql`
      SELECT dm_id, user_email
      FROM dm_participants
      WHERE dm_id = ANY(${dmIds})
    `;
    const otherByDm: Record<number, string> = {};
    (participants as { dm_id: number; user_email: string }[]).forEach((p) => {
      if (p.user_email !== userEmail) otherByDm[p.dm_id] = p.user_email;
    });

    const lastMessages = await sql`
      SELECT DISTINCT ON (dm_id) dm_id, id, sender_email, username, message_text, created_at
      FROM dm_messages
      WHERE dm_id = ANY(${dmIds})
      ORDER BY dm_id, created_at DESC
    `;

    const otherEmails = Object.values(otherByDm);
    const users =
      otherEmails.length > 0
        ? await sql`
      SELECT email, username FROM users WHERE email = ANY(${otherEmails})
    `
        : [];
    const userMap: Record<string, { username: string }> = {};
    (users as { email: string; username: string }[]).forEach((u) => {
      userMap[u.email] = { username: u.username };
    });

    const conversations = (lastMessages as { dm_id: number; id: number; sender_email: string; username: string; message_text: string; created_at: string }[]).map(
      (row) => {
        const otherEmail = otherByDm[row.dm_id];
        const other = userMap[otherEmail];
        return {
          dmId: row.dm_id,
          otherUser: { email: otherEmail, username: other?.username || otherEmail?.split('@')[0] || '?' },
          lastMessage: {
            id: row.id,
            sender_email: row.sender_email,
            username: row.username,
            message_text: row.message_text,
            created_at: row.created_at,
          },
        };
      }
    );

    conversations.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('List DMs error:', error);
    return NextResponse.json({ error: 'Failed to list DMs' }, { status: 500 });
  }
}

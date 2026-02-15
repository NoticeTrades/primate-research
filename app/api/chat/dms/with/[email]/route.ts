import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/chat/dms/with/[email] — get or create DM conversation with that user; return dmId, otherUser, messages
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email: otherEmailEnc } = await params;
    const otherEmail = decodeURIComponent(otherEmailEnc);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    const username = cookieStore.get('user_username')?.value;

    if (!userEmail || !username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!otherEmail || otherEmail === userEmail) {
      return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
    }

    const sql = getDb();

    const dmsWithMe = await sql`
      SELECT dm_id FROM dm_participants WHERE user_email = ${userEmail}
    `;
    const myDmIds = (dmsWithMe as { dm_id: number }[]).map((r) => r.dm_id);
    let dmId: number | null = null;
    if (myDmIds.length > 0) {
      const withOther = await sql`
        SELECT dm_id FROM dm_participants
        WHERE dm_id = ANY(${myDmIds}) AND user_email = ${otherEmail}
        LIMIT 1
      `;
      if (withOther.length > 0) {
        dmId = (withOther[0] as { dm_id: number }).dm_id;
      }
    }

    if (dmId == null) {
      const insert = await sql`INSERT INTO dm_conversations DEFAULT VALUES RETURNING id`;
      dmId = insert[0].id;
      await sql`
        INSERT INTO dm_participants (dm_id, user_email) VALUES (${dmId}, ${userEmail}), (${dmId}, ${otherEmail})
      `;
    }

    const otherUserRows = await sql`SELECT username FROM users WHERE email = ${otherEmail}`;
    const otherUsername = (otherUserRows[0] as { username: string } | undefined)?.username || otherEmail.split('@')[0];

    const messages = await sql`
      SELECT id, dm_id, sender_email, username, message_text, created_at
      FROM dm_messages
      WHERE dm_id = ${dmId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      dmId,
      otherUser: { email: otherEmail, username: otherUsername },
      messages: messages as { id: number; dm_id: number; sender_email: string; username: string; message_text: string; created_at: string }[],
    });
  } catch (error) {
    console.error('Get/create DM error:', error);
    return NextResponse.json({ error: 'Failed to get conversation' }, { status: 500 });
  }
}

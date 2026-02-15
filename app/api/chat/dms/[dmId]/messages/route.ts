import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/chat/dms/[dmId]/messages
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dmId: string }> }
) {
  try {
    const { dmId } = await params;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const id = parseInt(dmId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid DM id' }, { status: 400 });
    }

    const participant = await sql`
      SELECT 1 FROM dm_participants WHERE dm_id = ${id} AND user_email = ${userEmail}
    `;
    if (participant.length === 0) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    const messages = await sql`
      SELECT id, dm_id, sender_email, username, message_text, created_at
      FROM dm_messages
      WHERE dm_id = ${id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      messages: messages as { id: number; dm_id: number; sender_email: string; username: string; message_text: string; created_at: string }[],
    });
  } catch (error) {
    console.error('Get DM messages error:', error);
    return NextResponse.json({ error: 'Failed to get messages' }, { status: 500 });
  }
}

// POST /api/chat/dms/[dmId]/messages — send DM and notify recipient
export async function POST(
  request: Request,
  { params }: { params: Promise<{ dmId: string }> }
) {
  try {
    const { dmId } = await params;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    const username = cookieStore.get('user_username')?.value;

    if (!userEmail || !username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message_text } = await request.json();
    const text = typeof message_text === 'string' ? message_text.trim().slice(0, 2000) : '';
    if (!text) {
      return NextResponse.json({ error: 'Message text required' }, { status: 400 });
    }

    const sql = getDb();
    const id = parseInt(dmId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid DM id' }, { status: 400 });
    }

    const participants = await sql`
      SELECT user_email FROM dm_participants WHERE dm_id = ${id}
    `;
    const emails = (participants as { user_email: string }[]).map((p) => p.user_email);
    if (!emails.includes(userEmail)) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }
    const recipientEmail = emails.find((e) => e !== userEmail);
    if (!recipientEmail) {
      return NextResponse.json({ error: 'Invalid conversation' }, { status: 400 });
    }

    const insert = await sql`
      INSERT INTO dm_messages (dm_id, sender_email, username, message_text)
      VALUES (${id}, ${userEmail}, ${username}, ${text})
      RETURNING id, dm_id, sender_email, username, message_text, created_at
    `;
    const message = insert[0] as { id: number; dm_id: number; sender_email: string; username: string; message_text: string; created_at: string };

    await sql`
      INSERT INTO notifications (title, description, link, type, user_email)
      VALUES (
        ${`${username} sent you a message`},
        ${text.length > 80 ? text.substring(0, 80) + '...' : text},
        ${`/chat?dm=${id}`},
        'dm',
        ${recipientEmail}
      )
    `;

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Send DM error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

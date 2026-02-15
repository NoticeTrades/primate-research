import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/chat/dms/[dmId] — get DM conversation info (other participant) for current user
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

    const participants = await sql`
      SELECT user_email FROM dm_participants WHERE dm_id = ${id}
    `;
    const emails = (participants as { user_email: string }[]).map((p) => p.user_email);
    if (!emails.includes(userEmail)) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }
    const otherEmail = emails.find((e) => e !== userEmail);
    if (!otherEmail) {
      return NextResponse.json({ error: 'Invalid conversation' }, { status: 400 });
    }

    const users = await sql`
      SELECT email, username FROM users WHERE email = ${otherEmail}
    `;
    const other = users[0] as { email: string; username: string } | undefined;
    const otherUser = {
      email: otherEmail,
      username: other?.username || otherEmail.split('@')[0] || '?',
    };

    return NextResponse.json({ dmId: id, otherUser });
  } catch (error) {
    console.error('Get DM info error:', error);
    return NextResponse.json({ error: 'Failed to get conversation' }, { status: 500 });
  }
}

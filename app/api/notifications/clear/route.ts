import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

// POST /api/notifications/clear — clears all notifications for the logged-in user
// (sets a timestamp so notifications before this point are hidden)
export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    const userEmail = cookieStore.get('user_email')?.value;

    if (!sessionToken || !userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = getDb();

    await sql`
      UPDATE users
      SET notifications_cleared_at = NOW(), last_notification_seen = NOW()
      WHERE email = ${userEmail}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Clear notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



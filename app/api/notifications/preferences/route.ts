import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/notifications/preferences — get user's browser notification preference
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sql = getDb();
    const result = await sql`
      SELECT browser_notifications_enabled
      FROM users
      WHERE email = ${userEmail}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      browserNotificationsEnabled: result[0].browser_notifications_enabled || false,
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/preferences — update user's browser notification preference
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      UPDATE users
      SET browser_notifications_enabled = ${enabled}
      WHERE email = ${userEmail}
    `;

    return NextResponse.json({
      success: true,
      browserNotificationsEnabled: enabled,
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


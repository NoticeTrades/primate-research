import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../lib/db';

// GET /api/notifications — returns notifications + unread count for the logged-in user
// Respects notifications_cleared_at (hides notifications the user has cleared)
// Returns is_read per notification so the frontend can filter unread vs all
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    const userEmail = cookieStore.get('user_email')?.value;

    if (!sessionToken || !userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = getDb();

    // Get user's last_notification_seen and notifications_cleared_at timestamps
    const users = await sql`
      SELECT last_notification_seen, notifications_cleared_at FROM users WHERE email = ${userEmail}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const lastSeen = users[0].last_notification_seen;
    const clearedAt = users[0].notifications_cleared_at;

    // Get notifications (newest first), limit 20
    // If user has cleared notifications, only show those created after the cleared_at timestamp
    let notifications;
    if (clearedAt) {
      notifications = await sql`
        SELECT id, title, description, link, type, created_at
        FROM notifications
        WHERE created_at > ${clearedAt}
        ORDER BY created_at DESC
        LIMIT 20
      `;
    } else {
      notifications = await sql`
        SELECT id, title, description, link, type, created_at
        FROM notifications
        ORDER BY created_at DESC
        LIMIT 20
      `;
    }

    // Add is_read flag per notification based on last_notification_seen
    const notificationsWithReadStatus = notifications.map((notif: { created_at: string; [key: string]: unknown }) => ({
      ...notif,
      is_read: lastSeen ? new Date(notif.created_at) <= new Date(lastSeen) : false,
    }));

    // Count unread (created after last_notification_seen, and after cleared_at if set)
    let unreadResult;
    if (clearedAt) {
      unreadResult = await sql`
        SELECT COUNT(*) as count FROM notifications
        WHERE created_at > ${lastSeen} AND created_at > ${clearedAt}
      `;
    } else {
      unreadResult = await sql`
        SELECT COUNT(*) as count FROM notifications
        WHERE created_at > ${lastSeen}
      `;
    }
    const unreadCount = parseInt(unreadResult[0].count, 10);

    return NextResponse.json({
      notifications: notificationsWithReadStatus,
      unreadCount,
      lastSeen,
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



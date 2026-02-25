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
      SELECT browser_notifications_enabled, sound_notifications_enabled,
             trade_notifications_enabled, trade_notifications_email
      FROM users
      WHERE email = ${userEmail}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const r = result[0];
    return NextResponse.json({
      browserNotificationsEnabled: r.browser_notifications_enabled || false,
      soundNotificationsEnabled: r.sound_notifications_enabled !== false,
      tradeNotificationsEnabled: r.trade_notifications_enabled !== false,
      tradeNotificationsEmail: r.trade_notifications_email === true,
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

    const body = await request.json();
    const { enabled, soundEnabled, tradeNotificationsEnabled, tradeNotificationsEmail } = body;

    // Support both old format (just enabled) and new format (enabled and soundEnabled)
    if (typeof enabled === 'boolean') {
      // Update browser notifications
      const sql = getDb();
      
      // First check if user exists
      const userCheck = await sql`
        SELECT id FROM users WHERE email = ${userEmail}
      `;
      
      if (userCheck.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Try to update - if column doesn't exist, it will throw an error
      try {
        await sql`
          UPDATE users
          SET browser_notifications_enabled = ${enabled}
          WHERE email = ${userEmail}
        `;
      } catch (dbError: any) {
        // Check if the error is because the column doesn't exist
        if (dbError?.message?.includes('browser_notifications_enabled') || dbError?.code === '42703') {
          console.error('Database column browser_notifications_enabled does not exist. Please run database setup.');
          return NextResponse.json(
            { 
              error: 'Database setup required',
              message: 'The browser_notifications_enabled column does not exist. Please run database setup from the admin page.'
            },
            { status: 500 }
          );
        }
        throw dbError; // Re-throw if it's a different error
      }

      return NextResponse.json({
        success: true,
        browserNotificationsEnabled: enabled,
      });
    } else if (typeof soundEnabled === 'boolean') {
      // Update sound notifications
      const sql = getDb();
      
      // First check if user exists
      const userCheck = await sql`
        SELECT id FROM users WHERE email = ${userEmail}
      `;
      
      if (userCheck.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Try to update - if column doesn't exist, it will throw an error
      try {
        await sql`
          UPDATE users
          SET sound_notifications_enabled = ${soundEnabled}
          WHERE email = ${userEmail}
        `;
      } catch (dbError: any) {
        // Check if the error is because the column doesn't exist
        if (dbError?.message?.includes('sound_notifications_enabled') || dbError?.code === '42703') {
          console.error('Database column sound_notifications_enabled does not exist. Please run database setup.');
          return NextResponse.json(
            { 
              error: 'Database setup required',
              message: 'The sound_notifications_enabled column does not exist. Please run database setup from the admin page.'
            },
            { status: 500 }
          );
        }
        throw dbError; // Re-throw if it's a different error
      }

      return NextResponse.json({
        success: true,
        soundNotificationsEnabled: soundEnabled,
      });
    } else if (typeof tradeNotificationsEnabled === 'boolean' || typeof tradeNotificationsEmail === 'boolean') {
      const sql = getDb();
      const userCheck = await sql`SELECT id FROM users WHERE email = ${userEmail}`;
      if (userCheck.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (typeof tradeNotificationsEnabled === 'boolean' && typeof tradeNotificationsEmail === 'boolean') {
        await sql`
          UPDATE users SET trade_notifications_enabled = ${tradeNotificationsEnabled}, trade_notifications_email = ${tradeNotificationsEmail}
          WHERE email = ${userEmail}
        `;
      } else if (typeof tradeNotificationsEnabled === 'boolean') {
        await sql`
          UPDATE users SET trade_notifications_enabled = ${tradeNotificationsEnabled} WHERE email = ${userEmail}
        `;
      } else {
        await sql`
          UPDATE users SET trade_notifications_email = ${tradeNotificationsEmail} WHERE email = ${userEmail}
        `;
      }
      return NextResponse.json({
        success: true,
        tradeNotificationsEnabled: tradeNotificationsEnabled !== undefined ? tradeNotificationsEnabled : undefined,
        tradeNotificationsEmail: tradeNotificationsEmail !== undefined ? tradeNotificationsEmail : undefined,
      });
    } else {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error?.message || 'Failed to update preferences'
      },
      { status: 500 }
    );
  }
}


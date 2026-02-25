import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/user/test-profile-picture - Test if profile picture column exists and can be read
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = getDb();

    // Check if column exists
    const columnCheck = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'profile_picture_url'
    `;

    // Get current user's profile picture
    const user = await sql`
      SELECT email, username, profile_picture_url,
             LENGTH(profile_picture_url) as url_length,
             CASE WHEN profile_picture_url IS NULL THEN 'NULL' ELSE 'NOT NULL' END as url_status
      FROM users
      WHERE email = ${userEmail}
      LIMIT 1
    `;

    return NextResponse.json({
      columnExists: columnCheck.length > 0,
      columnInfo: columnCheck[0] || null,
      user: user[0] || null,
      userExists: user.length > 0,
    });
  } catch (error: any) {
    console.error('Test profile picture error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test profile picture', stack: error.stack },
      { status: 500 }
    );
  }
}


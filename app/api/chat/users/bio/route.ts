import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/chat/users/bio?email= - Get another user's public bio (for chat profile view)
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const viewerEmail = cookieStore.get('user_email')?.value;
    if (!viewerEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const sql = getDb();
    const users = await sql`
      SELECT username, bio
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0] as { username: string; bio: string | null };
    return NextResponse.json({
      username: user.username,
      bio: user.bio ?? null,
    });
  } catch (error: unknown) {
    console.error('Get user bio error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get bio' },
      { status: 500 }
    );
  }
}

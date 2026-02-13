import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    const sql = getDb();
    
    // Get users matching the query (for autocomplete)
    let users: Array<{ username: string; email: string; profile_picture_url: string | null; user_role: string | null }> = [];
    if (query.trim()) {
      users = await sql`
        SELECT username, email, profile_picture_url, user_role
        FROM users
        WHERE username ILIKE ${`%${query}%`}
          AND verified = true
        ORDER BY username ASC
        LIMIT 10
      `;
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users for mentions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}


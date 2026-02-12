import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/user/profile - Get user profile
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = getDb();
    const users = await sql`
      SELECT id, name, email, username, profile_picture_url, bio, created_at
      FROM users
      WHERE email = ${userEmail}
      LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Map snake_case to camelCase for frontend
    const user = users[0];
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        profilePictureUrl: user.profile_picture_url, // Map to camelCase
        bio: user.bio,
        createdAt: user.created_at,
        userRole: user.user_role || 'premium', // Include user role
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get profile' },
      { status: 500 }
    );
  }
}

// POST /api/user/profile - Update user profile
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { profilePictureUrl, bio } = await request.json();
    const sql = getDb();

    if (profilePictureUrl !== undefined && bio !== undefined) {
      await sql`
        UPDATE users
        SET profile_picture_url = ${profilePictureUrl}, bio = ${bio}
        WHERE email = ${userEmail}
      `;
    } else if (profilePictureUrl !== undefined) {
      await sql`
        UPDATE users
        SET profile_picture_url = ${profilePictureUrl}
        WHERE email = ${userEmail}
      `;
    } else if (bio !== undefined) {
      await sql`
        UPDATE users
        SET bio = ${bio}
        WHERE email = ${userEmail}
      `;
    } else {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Fetch updated user
    const users = await sql`
      SELECT id, name, email, username, profile_picture_url, bio, created_at
      FROM users
      WHERE email = ${userEmail}
      LIMIT 1
    `;

    // Map snake_case to camelCase for frontend
    const user = users[0];
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        profilePictureUrl: user.profile_picture_url, // Map to camelCase
        bio: user.bio,
        createdAt: user.created_at,
        userRole: user.user_role || 'premium', // Include user role
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}


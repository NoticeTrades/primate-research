import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// POST /api/user/profile-picture - Upload profile picture
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const sql = getDb();

    await sql`
      UPDATE users
      SET profile_picture_url = ${imageUrl}
      WHERE email = ${userEmail}
    `;

    return NextResponse.json({
      success: true,
      profilePictureUrl: imageUrl,
    });
  } catch (error: any) {
    console.error('Upload profile picture error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}


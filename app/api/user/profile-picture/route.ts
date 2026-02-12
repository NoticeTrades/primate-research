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

    // Check if user exists first
    const userCheck = await sql`
      SELECT email FROM users WHERE email = ${userEmail} LIMIT 1
    `;
    
    if (userCheck.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update profile picture
    const result = await sql`
      UPDATE users
      SET profile_picture_url = ${imageUrl}
      WHERE email = ${userEmail}
      RETURNING profile_picture_url, email
    `;

    if (result.length === 0) {
      console.error('Profile picture update failed - no rows affected for:', userEmail);
      return NextResponse.json({ error: 'Failed to update profile picture' }, { status: 500 });
    }

    console.log('Profile picture updated successfully for:', userEmail);
    console.log('Profile picture URL length:', (result[0].profile_picture_url || '').length);

    // Verify the update by fetching the user again
    const verify = await sql`
      SELECT profile_picture_url FROM users WHERE email = ${userEmail} LIMIT 1
    `;
    
    console.log('Verification - Profile picture URL exists:', !!verify[0]?.profile_picture_url);

    return NextResponse.json({
      success: true,
      profilePictureUrl: result[0].profile_picture_url || imageUrl,
    });
  } catch (error: any) {
    console.error('Upload profile picture error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}


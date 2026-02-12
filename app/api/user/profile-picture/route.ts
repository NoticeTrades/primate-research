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

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Validate base64 string format
    if (typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Image URL must be a string' }, { status: 400 });
    }

    // Check if it's a valid base64 data URL
    if (!imageUrl.startsWith('data:image/')) {
      console.warn('Profile picture is not a data URL, but proceeding anyway');
    }

    console.log('Received profile picture upload request');
    console.log('Image URL length:', imageUrl.length);
    console.log('Image URL preview:', imageUrl.substring(0, 50) + '...');

    const sql = getDb();

    // Check if user exists first
    const userCheck = await sql`
      SELECT email, profile_picture_url FROM users WHERE email = ${userEmail} LIMIT 1
    `;
    
    if (userCheck.length === 0) {
      console.error('User not found:', userEmail);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('User found, current profile_picture_url is:', userCheck[0].profile_picture_url ? 'SET' : 'NULL');

    // Check if column exists
    try {
      const columnCheck = await sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'profile_picture_url'
      `;
      console.log('Column exists:', columnCheck.length > 0);
    } catch (colError) {
      console.error('Error checking column:', colError);
    }

    // Update profile picture - use explicit parameter binding
    let result;
    try {
      result = await sql`
        UPDATE users
        SET profile_picture_url = ${imageUrl}
        WHERE email = ${userEmail}
        RETURNING profile_picture_url, email
      `;
      console.log('Update query executed, rows returned:', result.length);
    } catch (updateError: any) {
      console.error('Update error:', updateError);
      console.error('Error message:', updateError.message);
      console.error('Error code:', updateError.code);
      return NextResponse.json({ 
        error: 'Database update failed', 
        details: updateError.message,
        code: updateError.code 
      }, { status: 500 });
    }

    if (result.length === 0) {
      console.error('Profile picture update failed - no rows affected for:', userEmail);
      return NextResponse.json({ error: 'Failed to update profile picture - no rows affected' }, { status: 500 });
    }

    console.log('Profile picture updated successfully for:', userEmail);
    console.log('Returned profile_picture_url length:', (result[0].profile_picture_url || '').length);
    console.log('Returned profile_picture_url preview:', (result[0].profile_picture_url || '').substring(0, 50));

    // Verify the update by fetching the user again
    const verify = await sql`
      SELECT profile_picture_url, LENGTH(profile_picture_url) as url_length
      FROM users 
      WHERE email = ${userEmail} 
      LIMIT 1
    `;
    
    console.log('Verification query result:', {
      hasUrl: !!verify[0]?.profile_picture_url,
      urlLength: verify[0]?.url_length || 0,
    });

    if (!verify[0]?.profile_picture_url) {
      console.error('VERIFICATION FAILED: Profile picture was not saved!');
      return NextResponse.json({ 
        error: 'Profile picture update appeared to succeed but verification failed',
        saved: false 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profilePictureUrl: verify[0].profile_picture_url,
      verified: true,
    });
  } catch (error: any) {
    console.error('Upload profile picture error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}


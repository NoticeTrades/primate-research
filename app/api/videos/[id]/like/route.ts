import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/videos/[id]/like - Get like count and check if user liked it
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (isNaN(videoId)) {
      return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
    }

    const sql = getDb();

    // Get like count
    const likeCountResult = await sql`
      SELECT COUNT(*) as count
      FROM video_likes
      WHERE video_id = ${videoId}
    `;
    const likeCount = parseInt(likeCountResult[0]?.count || '0', 10);

    // Check if user liked it
    let userLiked = false;
    if (userEmail) {
      const userLikeResult = await sql`
        SELECT id
        FROM video_likes
        WHERE video_id = ${videoId} AND user_email = ${userEmail}
        LIMIT 1
      `;
      userLiked = userLikeResult.length > 0;
    }

    return NextResponse.json({
      likeCount,
      userLiked,
    });
  } catch (error: any) {
    console.error('Get likes error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get likes' },
      { status: 500 }
    );
  }
}

// POST /api/videos/[id]/like - Toggle like
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (isNaN(videoId)) {
      return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
    }

    const sql = getDb();
    const { videoType } = await request.json().catch(() => ({ videoType: 'exclusive' }));

    // Check if user already liked it
    const existingLike = await sql`
      SELECT id
      FROM video_likes
      WHERE video_id = ${videoId} AND user_email = ${userEmail} AND video_type = ${videoType || 'exclusive'}
      LIMIT 1
    `;

    if (existingLike.length > 0) {
      // Unlike - remove the like
      await sql`
        DELETE FROM video_likes
        WHERE video_id = ${videoId} AND user_email = ${userEmail} AND video_type = ${videoType || 'exclusive'}
      `;
    } else {
      // Like - add the like
      await sql`
        INSERT INTO video_likes (user_email, video_id, video_type)
        VALUES (${userEmail}, ${videoId}, ${videoType || 'exclusive'})
        ON CONFLICT (user_email, video_id, video_type) DO NOTHING
      `;
    }

    // Get updated like count
    const likeCountResult = await sql`
      SELECT COUNT(*) as count
      FROM video_likes
      WHERE video_id = ${videoId} AND video_type = ${videoType || 'exclusive'}
    `;
    const likeCount = parseInt(likeCountResult[0]?.count || '0', 10);

    // Check if user liked it
    const userLikeResult = await sql`
      SELECT id
      FROM video_likes
      WHERE video_id = ${videoId} AND user_email = ${userEmail} AND video_type = ${videoType || 'exclusive'}
      LIMIT 1
    `;
    const userLiked = userLikeResult.length > 0;

    return NextResponse.json({
      success: true,
      likeCount,
      userLiked,
    });
  } catch (error: any) {
    console.error('Toggle like error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle like' },
      { status: 500 }
    );
  }
}


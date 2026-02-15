import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/user/comments - Get all comments by the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = getDb();

    const comments = await sql`
      SELECT 
        vc.id,
        vc.video_id,
        vc.video_type,
        vc.comment_text,
        vc.parent_id,
        vc.created_at,
        v.title as video_title,
        v.thumbnail_url as video_thumbnail
      FROM video_comments vc
      LEFT JOIN videos v ON vc.video_id = v.id AND vc.video_type = 'exclusive'
      WHERE vc.user_email = ${userEmail}
      ORDER BY vc.created_at DESC
    `;

    return NextResponse.json({
      comments: comments.map((c: any) => ({
        id: c.id,
        videoId: c.video_id,
        videoType: c.video_type,
        commentText: c.comment_text,
        parentId: c.parent_id,
        createdAt: c.created_at,
        videoTitle: c.video_title,
        videoThumbnail: c.video_thumbnail,
      })),
    });
  } catch (error: any) {
    console.error('Get user comments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get comments' },
      { status: 500 }
    );
  }
}


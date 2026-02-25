import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/videos/saved - Get all saved videos for the current user
export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sql = getDb();

    const savedVideos = await sql`
      SELECT 
        sv.video_id,
        sv.video_type,
        sv.created_at as saved_at,
        v.title,
        v.description,
        v.video_url,
        v.thumbnail_url,
        v.date,
        v.duration,
        v.view_count,
        v.is_exclusive
      FROM saved_videos sv
      LEFT JOIN videos v ON sv.video_id = v.id AND sv.video_type = 'exclusive'
      WHERE sv.user_email = ${userEmail}
      ORDER BY sv.created_at DESC
    `;

    return NextResponse.json({
      savedVideos: savedVideos.map((video: any) => ({
        videoId: video.video_id,
        videoType: video.video_type,
        savedAt: video.saved_at,
        title: video.title,
        description: video.description,
        videoUrl: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        date: video.date,
        duration: video.duration,
        viewCount: video.view_count,
        isExclusive: video.is_exclusive,
      })),
    });
  } catch (error: any) {
    console.error('Get saved videos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get saved videos' },
      { status: 500 }
    );
  }
}


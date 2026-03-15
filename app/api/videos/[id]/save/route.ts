import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/videos/[id]/save - Check if user saved the video
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ saved: false });
    }

    if (isNaN(videoId)) {
      return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
    }

    const sql = getDb();
    const url = new URL(request.url);
    const videoType = url.searchParams.get('videoType') || 'exclusive';

    const savedResult = await sql`
      SELECT id
      FROM saved_videos
      WHERE video_id = ${videoId} AND user_email = ${userEmail} AND video_type = ${videoType}
      LIMIT 1
    `;

    return NextResponse.json({
      saved: savedResult.length > 0,
    });
  } catch (error: any) {
    console.error('Check save error:', error);
    return NextResponse.json({ saved: false });
  }
}

// POST /api/videos/[id]/save - Toggle save
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

    // Check if user already saved it
    const existingSave = await sql`
      SELECT id
      FROM saved_videos
      WHERE video_id = ${videoId} AND user_email = ${userEmail} AND video_type = ${videoType || 'exclusive'}
      LIMIT 1
    `;

    if (existingSave.length > 0) {
      // Unsave - remove the save
      await sql`
        DELETE FROM saved_videos
        WHERE video_id = ${videoId} AND user_email = ${userEmail} AND video_type = ${videoType || 'exclusive'}
      `;
      return NextResponse.json({
        success: true,
        saved: false,
      });
    } else {
      // Save - add the save
      await sql`
        INSERT INTO saved_videos (user_email, video_id, video_type)
        VALUES (${userEmail}, ${videoId}, ${videoType || 'exclusive'})
        ON CONFLICT (user_email, video_id, video_type) DO NOTHING
      `;
      return NextResponse.json({
        success: true,
        saved: true,
      });
    }
  } catch (error: any) {
    console.error('Toggle save error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to toggle save' },
      { status: 500 }
    );
  }
}


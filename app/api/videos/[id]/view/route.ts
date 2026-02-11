import { NextResponse } from 'next/server';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id, 10);

    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Invalid video ID' },
        { status: 400 }
      );
    }

    // Get user session to prevent duplicate views from same user in short time
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    
    // Use a simple rate limit: track views per user per video
    // For now, we'll just increment - but we could add a views table later for per-user tracking
    // For simplicity, we'll use a session-based approach: one view per user per video per session
    
    // Increment view count
    const sql = getDb();
    const result = await sql`
      UPDATE videos
      SET view_count = view_count + 1
      WHERE id = ${videoId}
      RETURNING view_count
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      viewCount: result[0].view_count,
    });
  } catch (error: any) {
    console.error('Track video view error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track view' },
      { status: 500 }
    );
  }
}


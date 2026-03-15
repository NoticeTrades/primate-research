import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

interface VideoData {
  title: string;
  description: string;
  videoUrl: string;
  videoType?: 'youtube' | 'exclusive' | 'external';
  category?: 'market-analysis' | 'trading-strategies' | 'educational' | 'live-trading' | 'market-structure' | 'risk-management';
  thumbnailUrl?: string;
  date?: string;
  duration?: string;
  isExclusive?: boolean;
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const videoData: VideoData = await request.json();

    // Validate required fields
    if (!videoData.title || !videoData.description || !videoData.videoUrl) {
      return NextResponse.json(
        { error: 'Title, description, and video URL are required' },
        { status: 400 }
      );
    }

    // Insert video into database
    const sql = getDb();
    
    console.log('Attempting to insert video:', {
      title: videoData.title,
      videoUrl: videoData.videoUrl,
      category: videoData.category,
    });
    
    try {
      const result = await sql`
        INSERT INTO videos (
          title,
          description,
          video_url,
          video_type,
          category,
          thumbnail_url,
          date,
          duration,
          is_exclusive
        ) VALUES (
          ${videoData.title},
          ${videoData.description},
          ${videoData.videoUrl},
          ${videoData.videoType || 'exclusive'},
          ${videoData.category || 'educational'},
          ${videoData.thumbnailUrl || null},
          ${videoData.date || null},
          ${videoData.duration || null},
          ${videoData.isExclusive !== false}
        )
        RETURNING id, title, video_url
      `;

      console.log('Video inserted into database successfully:', result[0]);

      // Verify it was inserted by fetching it back
      const verify = await sql`
        SELECT id, title, video_url FROM videos WHERE id = ${result[0].id}
      `;
      console.log('Verified video in database:', verify[0]);

      return NextResponse.json({
        success: true,
        message: 'Video added to The Vault successfully',
        videoId: result[0]?.id,
        video: result[0],
      });
    } catch (dbError: any) {
      console.error('Database insertion error:', dbError);
      console.error('Error details:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
      });
      throw dbError;
    }
  } catch (error: any) {
    console.error('Add video error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add video' },
      { status: 500 }
    );
  }
}


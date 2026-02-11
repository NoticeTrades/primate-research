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
    await sql`
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
    `;

    return NextResponse.json({
      success: true,
      message: 'Video added to The Vault successfully',
    });
  } catch (error: any) {
    console.error('Add video error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add video' },
      { status: 500 }
    );
  }
}


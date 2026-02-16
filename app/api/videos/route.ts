import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    
    // Fetch all videos from database
    const videos = await sql`
      SELECT 
        id,
        title,
        description,
        video_url as "videoUrl",
        video_type as "videoType",
        category,
        thumbnail_url as "thumbnailUrl",
        date,
        duration,
        is_exclusive as "isExclusive",
        view_count as "viewCount",
        created_at as "createdAt"
      FROM videos
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      videos: videos.map((v: any) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        videoUrl: v.videoUrl,
        videoType: v.videoType || 'exclusive',
        category: v.category || 'educational',
        thumbnailUrl: v.thumbnailUrl || '',
        date: v.date || null,
        duration: v.duration || null,
        isExclusive: v.isExclusive !== false,
        viewCount: v.viewCount || 0,
        createdAt: v.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Fetch videos error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}


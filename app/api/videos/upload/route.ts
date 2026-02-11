import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Check authentication (admin only)
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin (you can add admin check here)
    // For now, we'll allow any authenticated user - you can restrict this later

    const formData = await request.formData();
    const file = formData.get('video') as File;
    const thumbnail = formData.get('thumbnail') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Video file too large. Maximum size is 500MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const videoFileName = `videos/${timestamp}-${sanitizedName}`;

    // Upload video to Vercel Blob
    const videoBlob = await put(videoFileName, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    let thumbnailUrl = '';

    // Upload thumbnail if provided
    if (thumbnail && thumbnail.size > 0) {
      const thumbnailFileName = `videos/thumbnails/${timestamp}-${sanitizedName.replace(/\.[^/.]+$/, '')}.jpg`;
      const thumbnailBlob = await put(thumbnailFileName, thumbnail, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      thumbnailUrl = thumbnailBlob.url;
    }

    return NextResponse.json({
      success: true,
      videoUrl: videoBlob.url,
      thumbnailUrl: thumbnailUrl || null,
      size: file.size,
      contentType: file.type,
    });
  } catch (error: any) {
    console.error('Video upload error:', error);
    
    // Check if it's a missing token error
    if (error.message?.includes('BLOB_READ_WRITE_TOKEN') || !process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error: 'Vercel Blob not configured. Please add BLOB_READ_WRITE_TOKEN to your environment variables.',
          setupRequired: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to upload video' },
      { status: 500 }
    );
  }
}


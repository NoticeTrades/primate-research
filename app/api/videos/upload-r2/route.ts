import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

// Cloudflare R2 configuration
const getR2Client = () => {
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
};

// POST /api/videos/upload-r2 — upload video to Cloudflare R2
export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if R2 is configured
    const r2Client = getR2Client();
    if (!r2Client) {
      return NextResponse.json(
        {
          error: 'Cloudflare R2 not configured. Please add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY to your environment variables.',
          setupRequired: true,
        },
        { status: 500 }
      );
    }

    if (!process.env.R2_BUCKET_NAME) {
      return NextResponse.json(
        {
          error: 'R2_BUCKET_NAME not configured. Please add it to your environment variables.',
          setupRequired: true,
        },
        { status: 500 }
      );
    }

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

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const videoFileName = `videos/${timestamp}-${sanitizedName}`;

    // Upload video to R2
    const videoBuffer = Buffer.from(await file.arrayBuffer());
    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: videoFileName,
        Body: videoBuffer,
        ContentType: file.type,
      })
    );

    // Get public URL (assuming public bucket or custom domain)
    const publicUrl = process.env.R2_PUBLIC_URL 
      ? `${process.env.R2_PUBLIC_URL}/${videoFileName}`
      : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${process.env.R2_BUCKET_NAME}/${videoFileName}`;

    let thumbnailUrl = '';

    // Upload thumbnail if provided
    if (thumbnail && thumbnail.size > 0) {
      const thumbnailFileName = `videos/thumbnails/${timestamp}-${sanitizedName.replace(/\.[^/.]+$/, '')}.jpg`;
      const thumbnailBuffer = Buffer.from(await thumbnail.arrayBuffer());
      
      await r2Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: thumbnailFileName,
          Body: thumbnailBuffer,
          ContentType: thumbnail.type,
        })
      );

      thumbnailUrl = process.env.R2_PUBLIC_URL
        ? `${process.env.R2_PUBLIC_URL}/${thumbnailFileName}`
        : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${process.env.R2_BUCKET_NAME}/${thumbnailFileName}`;
    }

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
      thumbnailUrl: thumbnailUrl || null,
      size: file.size,
      contentType: file.type,
    });
  } catch (error: any) {
    console.error('R2 upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload video to R2' },
      { status: 500 }
    );
  }
}


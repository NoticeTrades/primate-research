import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

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

// POST /api/videos/upload-r2-client — generate presigned URL for client-side upload
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

    const { filename, contentType, fileSize } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const videoFileName = `videos/${timestamp}-${sanitizedName}`;

    // Generate presigned URL for upload (valid for 1 hour)
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: videoFileName,
      ContentType: contentType || 'video/mp4',
    });

    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    // Get public URL after upload
    const publicUrl = process.env.R2_PUBLIC_URL 
      ? `${process.env.R2_PUBLIC_URL}/${videoFileName}`
      : `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${process.env.R2_BUCKET_NAME}/${videoFileName}`;

    return NextResponse.json({
      success: true,
      presignedUrl,
      publicUrl,
      filename: videoFileName,
    });
  } catch (error: any) {
    console.error('Generate R2 presigned URL error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}


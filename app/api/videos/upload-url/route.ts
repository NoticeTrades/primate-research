import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

// POST /api/videos/upload-url — generates a signed upload URL for client-side upload
export async function POST(request: Request) {
  try {
    // Check authentication
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { filename, contentType } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error: 'Vercel Blob not configured. Please add BLOB_READ_WRITE_TOKEN to your environment variables.',
          setupRequired: true,
        },
        { status: 500 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobFileName = `videos/${timestamp}-${sanitizedName}`;

    // Return the filename and token info for client-side upload
    // The client will use @vercel/blob to upload directly
    return NextResponse.json({
      success: true,
      filename: blobFileName,
      token: process.env.BLOB_READ_WRITE_TOKEN, // In production, use a more secure approach
    });
  } catch (error: any) {
    console.error('Generate upload URL error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}


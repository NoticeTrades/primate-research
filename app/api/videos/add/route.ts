import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

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

    // Read current videos file
    const videosPath = join(process.cwd(), 'data', 'videos.ts');
    const fileContent = await readFile(videosPath, 'utf-8');

    // Parse the videos array (simple regex approach)
    // Find the videos array start
    const arrayStart = fileContent.indexOf('export const videos: VideoEntry[] = [');
    if (arrayStart === -1) {
      return NextResponse.json(
        { error: 'Could not find videos array in data file' },
        { status: 500 }
      );
    }

    // Find the closing bracket of the array
    let bracketCount = 0;
    let arrayEnd = arrayStart;
    let inString = false;
    let stringChar = '';

    for (let i = arrayStart; i < fileContent.length; i++) {
      const char = fileContent[i];
      const prevChar = i > 0 ? fileContent[i - 1] : '';

      // Handle string escaping
      if (prevChar === '\\') continue;

      // Toggle string state
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      // Count brackets only when not in string
      if (!inString) {
        if (char === '[') bracketCount++;
        if (char === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            arrayEnd = i;
            break;
          }
        }
      }
    }

    // Extract existing videos
    const arrayContent = fileContent.substring(arrayStart, arrayEnd + 1);
    const beforeArray = fileContent.substring(0, arrayStart);
    const afterArray = fileContent.substring(arrayEnd + 1);

    // Generate new video entry
    const newVideoEntry = `  {
    title: '${videoData.title.replace(/'/g, "\\'")}',
    description: '${videoData.description.replace(/'/g, "\\'").replace(/\n/g, '\\n')}',
    videoUrl: '${videoData.videoUrl}',
    videoType: '${videoData.videoType || 'exclusive'}',
    category: '${videoData.category || 'educational'}',
    ${videoData.thumbnailUrl ? `thumbnailUrl: '${videoData.thumbnailUrl}',` : 'thumbnailUrl: \'\','}
    ${videoData.date ? `date: '${videoData.date}',` : ''}
    ${videoData.duration ? `duration: '${videoData.duration}',` : ''}
    ${videoData.isExclusive !== undefined ? `isExclusive: ${videoData.isExclusive},` : 'isExclusive: true,'}
  },`;

    // Insert new video at the beginning of the array (most recent first)
    const arrayStartPos = arrayContent.indexOf('[') + 1;
    const newArrayContent =
      arrayContent.substring(0, arrayStartPos) +
      '\n' +
      newVideoEntry +
      arrayContent.substring(arrayStartPos);

    // Write updated file
    const newFileContent = beforeArray + newArrayContent + afterArray;
    await writeFile(videosPath, newFileContent, 'utf-8');

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


import { NextResponse } from 'next/server';

/**
 * GET /api/youtube-stats?ids=VIDEO_ID_1,VIDEO_ID_2
 * Returns view counts for the given YouTube video IDs.
 * Requires YOUTUBE_API_KEY in environment (optional; returns empty if not set).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!idsParam) {
    return NextResponse.json({ error: 'ids parameter required' }, { status: 400 });
  }

  const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({});
  }

  if (!apiKey) {
    return NextResponse.json(
      Object.fromEntries(ids.map((id) => [id, null])),
      { status: 200 }
    );
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(',')}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error('YouTube API error:', data);
      return NextResponse.json(
        Object.fromEntries(ids.map((id) => [id, null])),
        { status: 200 }
      );
    }

    const stats: Record<string, number | null> = {};
    for (const id of ids) {
      stats[id] = null;
    }
    for (const item of data.items || []) {
      const viewCount = item.statistics?.viewCount;
      stats[item.id] = viewCount != null ? Number(viewCount) : null;
    }
    return NextResponse.json(stats);
  } catch (error) {
    console.error('youtube-stats error:', error);
    return NextResponse.json(
      Object.fromEntries(ids.map((id) => [id, null])),
      { status: 200 }
    );
  }
}

import { NextResponse } from 'next/server';

/**
 * GET /api/youtube-live
 * Returns whether the configured YouTube channel is currently live streaming.
 * Uses YOUTUBE_API_KEY and either YOUTUBE_CHANNEL_ID or YOUTUBE_CHANNEL_HANDLE (e.g. noticetrades).
 * Response: { live: boolean, videoId?: string, title?: string }
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE || 'noticetrades';

  if (!apiKey) {
    return NextResponse.json({ live: false });
  }

  try {
    let resolvedChannelId = channelId?.trim();

    if (!resolvedChannelId && channelHandle) {
      const handle = channelHandle.replace(/^@/, '');
      const channelsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${encodeURIComponent(handle)}&key=${apiKey}`,
        { next: { revalidate: 3600 } }
      );
      const channelsData = await channelsRes.json();
      const first = channelsData?.items?.[0];
      if (first?.id) resolvedChannelId = first.id;
    }

    if (!resolvedChannelId) {
      return NextResponse.json({ live: false });
    }

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${resolvedChannelId}&eventType=live&type=video&key=${apiKey}`,
      { cache: 'no-store' }
    );
    const searchData = await searchRes.json();

    const items = searchData?.items || [];
    const liveItem = items[0];
    if (!liveItem?.id?.videoId) {
      return NextResponse.json({ live: false });
    }

    return NextResponse.json({
      live: true,
      videoId: liveItem.id.videoId,
      title: liveItem.snippet?.title || undefined,
    });
  } catch (error) {
    console.error('youtube-live error:', error);
    return NextResponse.json({ live: false });
  }
}

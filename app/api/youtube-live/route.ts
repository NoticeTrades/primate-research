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
      const handle = channelHandle.replace(/^@/, '').trim();
      // forHandle is for @handle (e.g. @noticetrades); forUsername is legacy username only
      const channelsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`,
        { cache: 'no-store' }
      );
      const channelsData = await channelsRes.json();
      let first = channelsData?.items?.[0];
      if (first?.id) resolvedChannelId = first.id;
      // Fallback: search for channel by handle (e.g. if forHandle not supported or returns nothing)
      if (!resolvedChannelId && channelsData?.items?.length === 0) {
        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent('@' + handle)}&type=channel&key=${apiKey}`,
          { cache: 'no-store' }
        );
        const searchData = await searchRes.json();
        const channelItem = searchData?.items?.[0];
        if (channelItem?.id?.channelId) resolvedChannelId = channelItem.id.channelId;
      }
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

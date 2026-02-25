/**
 * Video entries for the /videos page.
 * Add or edit entries below. View counts are fetched from YouTube when
 * YOUTUBE_API_KEY is set in environment (optional).
 * 
 * For exclusive videos (not YouTube), set videoType to 'exclusive' and provide
 * a direct video file URL (e.g., '/videos/exclusive-video.mp4' or a cloud storage URL).
 */

export type VideoType = 'youtube' | 'exclusive' | 'external';
export type VideoCategory = 'market-analysis' | 'trading-strategies' | 'educational' | 'live-trading' | 'market-structure' | 'risk-management' | 'all';

export interface VideoEntry {
  title: string;
  description: string;
  videoUrl: string;
  videoType?: VideoType; // 'youtube' (default), 'exclusive', or 'external'
  category?: VideoCategory; // For filtering
  thumbnailUrl?: string;
  date?: string;
  duration?: string;
  isExclusive?: boolean; // Mark as exclusive content
}

export const videos: VideoEntry[] = [
  {
    title: 'How to Use Market Structure (For Beginners)',
    description:
      'This presentation covers how you can use market structure within your trading framework. It is IMPORTANT to note that this will NOT make you profitable but will serve as a guide to support your trading.',
    videoUrl: 'https://www.youtube.com/watch?v=N4WGsdHnDNI&t=345s',
    videoType: 'youtube',
    category: 'market-structure',
    thumbnailUrl: '',
    date: 'Dec 2024',
  },
  {
    title: 'Understanding The Swing Failure Pattern (SFP) in Trading',
    description:
      'Learn how to identify and trade the Swing Failure Pattern, a key market structure concept.',
    videoUrl: 'https://www.youtube.com/watch?v=e6oCCj-VSR8',
    videoType: 'youtube',
    category: 'trading-strategies',
    thumbnailUrl: '',
    date: 'Dec 2023',
  },
  {
    title: 'Why Most Traders Fail... (The 3 Steps To Success)',
    description:
      "I talk about a topic that isn't talked about enough... Why most traders fail.. and I mean why they ACTUALLY fail. It isn't the concept you trade.. it's how you approach the market, and how you have been skipping 2 steps..",
    videoUrl: 'https://www.youtube.com/watch?v=6tFvBGBFeO8&t=627s',
    videoType: 'youtube',
    category: 'educational',
    thumbnailUrl: '',
    date: 'Sep 2023',
  },
];

/** Extract YouTube video ID from watch or embed URL */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

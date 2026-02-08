'use client';

import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import ScrollFade from '../components/ScrollFade';
import MarketTicker from '../components/MarketTicker';
import VideoCard from '../components/VideoCard';

export default function VideosPage() {
  // TEMPORARY: Auth disabled for deployment
  // TODO: Enable authentication with database/auth service
  const isAuthenticated = true; // Set to false to require login

  // Sample videos data
  const videos = [
    {
      title: 'How to Use Market Structure (For Beginners)',
      description:
        'This presentation covers how you can use market structure within your trading framework. It is IMPORTANT to note that this will NOT make you profitable but will serve as a guide to support your trading.',
      videoUrl: 'https://www.youtube.com/watch?v=N4WGsdHnDNI&t=345s',
      thumbnailUrl: '',
      date: 'Dec 2024',
    },
    {
      title: 'Understanding The Swing Failure Pattern (SFP) in Trading',
      description: 'Learn how to identify and trade the Swing Failure Pattern, a key market structure concept.',
      videoUrl: 'https://www.youtube.com/watch?v=e6oCCj-VSR8',
      thumbnailUrl: '',
      date: 'Dec 2023',
    },
    {
      title: 'Why Most Traders Fail... (The 3 Steps To Success)',
      description:
        'I talk about a topic that isn\'t talked about enough... Why most traders fail.. and I mean why they ACTUALLY fail. It isn\'t the concept you trade.. it\'s how you approach the market, and how you have been skipping 2 steps..',
      videoUrl: 'https://www.youtube.com/watch?v=6tFvBGBFeO8&t=627s',
      thumbnailUrl: '',
      date: 'Sep 2023',
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-xl">Please log in to access videos.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black dark:bg-zinc-950 relative">
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-zinc-50 mb-4">
              Video Content
            </h1>
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              Educational videos and market analysis
            </p>
          </div>

          {/* Videos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {videos.map((video, index) => (
              <VideoCard key={index} {...video} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

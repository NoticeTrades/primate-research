'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (el?: HTMLElement | null) => void;
      };
    };
  }
}

export default function TweetEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !url) return;

    const loadWidgets = () => {
      if (typeof window !== 'undefined' && window.twttr?.widgets?.load) {
        window.twttr.widgets.load(container);
      }
    };

    if (window.twttr?.widgets?.load) {
      loadWidgets();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.onload = loadWidgets;
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [url]);

  return (
    <div ref={containerRef} className="flex justify-center my-6 [&_.twitter-tweet]:mx-auto">
      <blockquote className="twitter-tweet" data-dnt="true" data-theme="dark">
        <a href={url}>Tweet</a>
      </blockquote>
    </div>
  );
}

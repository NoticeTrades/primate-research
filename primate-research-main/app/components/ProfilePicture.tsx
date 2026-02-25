'use client';

import { useState, useEffect } from 'react';

export default function ProfilePicture() {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState('/nick-headshot.jpg');
  
  // Try multiple possible file names
  const possiblePaths = [
    '/nick-headshot.jpg',
    '/nick-headshot.jpg.jpg', // Handle double extension
    '/nick-headshot.png',
    '/nick-headshot.JPG',
    '/nick-headshot.PNG',
    '/nick-thomas.jpg',
    '/nick-thomas.png',
  ];

  useEffect(() => {
    // Test if image exists by trying to load it
    const testImage = new Image();
    let currentIndex = 0;

    const tryNextImage = () => {
      if (currentIndex < possiblePaths.length) {
        testImage.src = possiblePaths[currentIndex];
        testImage.onload = () => {
          setImageSrc(possiblePaths[currentIndex]);
          setImageError(false);
        };
        testImage.onerror = () => {
          currentIndex++;
          tryNextImage();
        };
      } else {
        setImageError(true);
      }
    };

    tryNextImage();
  }, []);

  return (
    <div className="w-48 h-48 relative rounded-full overflow-hidden flex-shrink-0 border-4 border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
      {!imageError ? (
        <img
          src={imageSrc}
          alt="Nick Thomas"
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
          <div className="text-4xl font-bold mb-2">NT</div>
          <div className="text-xs text-center px-2">Add nick-headshot.jpg<br/>to public folder</div>
        </div>
      )}
    </div>
  );
}

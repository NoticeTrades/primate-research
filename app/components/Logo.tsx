'use client';

import { useState, useEffect } from 'react';

export default function Logo() {
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState('/primate-logo.png');
  
  // Try multiple possible file names
  const possiblePaths = [
    '/primate-logo.png',
    '/primate-logo.jpg',
    '/primate-logo.svg',
    '/primate-logo.PNG',
    '/primate-logo.JPG',
    '/logo.png',
    '/logo.jpg',
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
    <div className="w-12 h-12 relative flex-shrink-0">
      {!imageError ? (
        <img
          src={imageSrc}
          alt="Primate Trading Logo"
          className="w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center text-xl font-bold text-white">
          P
        </div>
      )}
    </div>
  );
}

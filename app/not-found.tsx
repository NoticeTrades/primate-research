'use client';

import Link from 'next/link';
import Navigation from './components/Navigation';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Navigation />
      <div className="flex items-center justify-center min-h-[80vh] px-6">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-black dark:text-zinc-50 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
            Page Not Found
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-8">
            The page you're looking for doesn't exist.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/research', '/videos', '/trades', '/ticker', '/calendar', '/notifications', '/profile'];

// Check if the request is from a search engine crawler
function isSearchEngineCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return (
    ua.includes('googlebot') ||
    ua.includes('bingbot') ||
    ua.includes('slurp') || // Yahoo
    ua.includes('duckduckbot') ||
    ua.includes('baiduspider') ||
    ua.includes('yandexbot') ||
    ua.includes('sogou') ||
    ua.includes('exabot') ||
    ua.includes('facebot') ||
    ua.includes('ia_archiver') ||
    ua.includes('facebookexternalhit') || // Facebook crawler
    ua.includes('twitterbot') || // Twitter crawler
    ua.includes('linkedinbot') || // LinkedIn crawler
    ua.includes('whatsapp') || // WhatsApp link preview
    ua.includes('discordbot') || // Discord link preview
    ua.includes('slackbot') // Slack link preview
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('session_token')?.value;
  const isAuthenticated = !!sessionToken;
  const userAgent = request.headers.get('user-agent');

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Allow search engine crawlers to access protected routes for SEO
  const isCrawler = isSearchEngineCrawler(userAgent);

  // Redirect unauthenticated users from protected routes to signup
  // BUT allow search engine crawlers to access these pages
  if (isProtectedRoute && !isAuthenticated && !isCrawler) {
    const signupUrl = new URL('/signup', request.url);
    signupUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signupUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/research/:path*',
    '/videos/:path*',
    '/trades/:path*',
    '/ticker/:path*',
    '/calendar/:path*',
    '/notifications/:path*',
    '/profile/:path*',
  ],
};


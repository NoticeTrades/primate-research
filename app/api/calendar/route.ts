// This route is no longer needed — calendar data is now powered by TradingView widget
// Keeping file to avoid 404s on any cached requests

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: 'Calendar data is now embedded via TradingView widget. No API key required.',
  });
}

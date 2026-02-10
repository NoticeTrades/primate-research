import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function formatDateStr(d: Date): string {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getWeekRange(offset: number = 0) {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { from: formatDateStr(monday), to: formatDateStr(sunday) };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekOffset = parseInt(searchParams.get('week') || '0', 10);

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'FINNHUB_API_KEY is not configured. Get a free key at https://finnhub.io/register and add it to your environment variables.' },
        { status: 500 }
      );
    }

    const { from, to } = getWeekRange(weekOffset);

    const response = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${apiKey}`,
      {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 900 }, // Cache for 15 minutes
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('FinnHub API error:', response.status, text);
      return NextResponse.json(
        { error: `FinnHub API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // FinnHub returns { economicCalendar: [...] } or { economicCalendar: { result: [...] } }
    let events: any[] = [];
    if (Array.isArray(data?.economicCalendar)) {
      events = data.economicCalendar;
    } else if (Array.isArray(data?.economicCalendar?.result)) {
      events = data.economicCalendar.result;
    }

    // Normalize events to a consistent shape
    const normalized = events.map((e: any) => ({
      event: e.event || 'Unknown Event',
      country: (e.country || '').toUpperCase(),
      date: e.date || e.datetime || null, // e.g. "2026-02-10 08:30:00" or "2026-02-10"
      time: e.time || null, // e.g. "08:30:00"
      impact: (e.impact || 'low').toLowerCase(),
      actual: e.actual ?? null,
      estimate: e.estimate ?? null,
      prev: e.prev ?? null,
      unit: e.unit || '',
    }));

    // Sort by date/time
    normalized.sort((a: any, b: any) => {
      const dateA = a.date || '9999';
      const dateB = b.date || '9999';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.time || '99:99';
      const timeB = b.time || '99:99';
      return timeA.localeCompare(timeB);
    });

    return NextResponse.json({
      events: normalized,
      from,
      to,
      weekOffset,
    });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}


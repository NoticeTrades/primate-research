import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// POST /api/feedback — submit feedback from an authenticated user
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    const userEmail = cookieStore.get('user_email')?.value;
    const username = cookieStore.get('user_username')?.value;

    if (!sessionToken || !userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { category, message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const sql = getDb();

    await sql`
      INSERT INTO feedback (user_email, username, category, message)
      VALUES (${userEmail}, ${username || null}, ${category || 'general'}, ${message.trim()})
    `;

    return NextResponse.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


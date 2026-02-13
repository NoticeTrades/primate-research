import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sql = getDb();
    const rooms = await sql`
      SELECT id, name, description, topic, is_active, created_at
      FROM chat_rooms
      WHERE is_active = true
      ORDER BY name ASC
    `;

    return NextResponse.json({ rooms });
  } catch (error: any) {
    console.error('Error fetching chat rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat rooms' },
      { status: 500 }
    );
  }
}


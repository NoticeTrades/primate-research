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
    const allRooms = await sql`
      SELECT id, name, description, topic, is_active, created_at
      FROM chat_rooms
      WHERE is_active = true
    `;

    // Order rooms: General, Crypto, Nick's Trades, Day Trades first, then others alphabetically
    const priorityRooms = ['General', 'Crypto', "Nick's Trades", 'Day Trades'];
    const rooms = allRooms.sort((a, b) => {
      const aIndex = priorityRooms.indexOf(a.name);
      const bIndex = priorityRooms.indexOf(b.name);
      
      // If both are priority rooms, maintain their order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // Priority rooms come first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // Others sorted alphabetically
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ rooms });
  } catch (error: any) {
    console.error('Error fetching chat rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat rooms' },
      { status: 500 }
    );
  }
}


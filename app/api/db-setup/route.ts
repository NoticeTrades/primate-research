import { NextResponse } from 'next/server';
import { initDb } from '../../../lib/db';

// GET /api/db-setup — creates the users table if it doesn't exist.
// Call this once after setting up your Neon database.
export async function GET() {
  try {
    await initDb();
    return NextResponse.json({ success: true, message: 'Database tables created successfully.' });
  } catch (error) {
    console.error('DB setup error:', error);
    return NextResponse.json(
      { error: `Database setup failed: ${error}` },
      { status: 500 }
    );
  }
}



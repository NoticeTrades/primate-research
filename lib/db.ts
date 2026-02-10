import { neon } from '@neondatabase/serverless';

// Returns a SQL query function connected to your Neon database.
// Set DATABASE_URL in your .env.local (local dev) and Vercel environment variables (production).
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local or Vercel environment variables.\n' +
      'Get a free Neon database at https://neon.tech'
    );
  }
  return neon(process.env.DATABASE_URL);
}

// Call this once to create tables (idempotent — safe to call multiple times).
export async function initDb() {
  const sql = getDb();

  // Users table
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      last_notification_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Add columns if upgrading from an older schema
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_notification_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires TIMESTAMP WITH TIME ZONE
  `;
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_cleared_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
  `;

  // Mark all existing users (who signed up before email verification) as verified
  await sql`
    UPDATE users SET verified = true
    WHERE verification_code IS NULL AND verified = false
  `;

  // Notifications table
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      link TEXT,
      type TEXT DEFAULT 'update',
      user_email TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  
  // Add user_email column if it doesn't exist (for user-specific notifications)
  await sql`
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_email TEXT
  `;

  // Feedback table
  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      username TEXT,
      category TEXT DEFAULT 'general',
      message TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
}


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
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS browser_notifications_enabled BOOLEAN DEFAULT FALSE
  `;
  // Use TEXT type which can store up to 1GB in Postgres (plenty for base64 images)
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT
  `;
  
  // Verify column was created (for debugging)
  const columnCheck = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'profile_picture_url'
  `;
  if (columnCheck.length === 0) {
    console.warn('WARNING: profile_picture_url column may not exist!');
  } else {
    console.log('profile_picture_url column verified:', columnCheck[0]);
  }
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT
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

  // Videos table (for The Vault)
  await sql`
    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      video_url TEXT NOT NULL,
      video_type TEXT DEFAULT 'exclusive',
      category TEXT DEFAULT 'educational',
      thumbnail_url TEXT,
      date TEXT,
      duration TEXT,
      is_exclusive BOOLEAN DEFAULT true,
      view_count INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  
  // Add view_count column if it doesn't exist (for existing databases)
  await sql`
    ALTER TABLE videos ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0
  `;

  // Video likes table
  await sql`
    CREATE TABLE IF NOT EXISTS video_likes (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      video_id INTEGER NOT NULL,
      video_type TEXT DEFAULT 'exclusive',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_email, video_id, video_type)
    )
  `;

  // Saved videos table
  await sql`
    CREATE TABLE IF NOT EXISTS saved_videos (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      video_id INTEGER NOT NULL,
      video_type TEXT DEFAULT 'exclusive',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_email, video_id, video_type)
    )
  `;

  // Video comments table
  await sql`
    CREATE TABLE IF NOT EXISTS video_comments (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      username TEXT NOT NULL,
      video_id INTEGER NOT NULL,
      video_type TEXT DEFAULT 'exclusive',
      comment_text TEXT NOT NULL,
      parent_id INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (parent_id) REFERENCES video_comments(id) ON DELETE CASCADE
    )
  `;

  // Create indexes for better performance
  await sql`
    CREATE INDEX IF NOT EXISTS idx_video_likes_video ON video_likes(video_id, video_type)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_saved_videos_user ON saved_videos(user_email)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_video_comments_video ON video_comments(video_id, video_type)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_video_comments_parent ON video_comments(parent_id)
  `;
}


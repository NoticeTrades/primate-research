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
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS sound_notifications_enabled BOOLEAN DEFAULT TRUE
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
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'premium'
  `;
  
  // Set noticetrades as owner/founder
  await sql`
    UPDATE users 
    SET user_role = 'owner' 
    WHERE username = 'noticetrades' AND (user_role IS NULL OR user_role != 'owner')
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

  // Chat rooms table
  await sql`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      topic TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Chat messages table
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      room_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      username TEXT NOT NULL,
      message_text TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
    )
  `;

  // Chat message files table (for file attachments)
  await sql`
    CREATE TABLE IF NOT EXISTS chat_message_files (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL,
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
    )
  `;

  // Chat message reactions (emoji reactions per message)
  await sql`
    CREATE TABLE IF NOT EXISTS chat_message_reactions (
      id SERIAL PRIMARY KEY,
      message_id INTEGER NOT NULL,
      user_email TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(message_id, user_email, emoji),
      FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message ON chat_message_reactions(message_id)
  `;

  // Chat room read tracking (for unread mention badges per channel)
  await sql`
    CREATE TABLE IF NOT EXISTS chat_room_read (
      user_email TEXT NOT NULL,
      room_id INTEGER NOT NULL,
      last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_email, room_id),
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE
    )
  `;

  // DM conversations (one row per pair of users)
  await sql`
    CREATE TABLE IF NOT EXISTS dm_conversations (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS dm_participants (
      dm_id INTEGER NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      PRIMARY KEY (dm_id, user_email)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS dm_messages (
      id SERIAL PRIMARY KEY,
      dm_id INTEGER NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
      sender_email TEXT NOT NULL,
      username TEXT NOT NULL,
      message_text TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_dm_messages_dm ON dm_messages(dm_id, created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_dm_participants_user ON dm_participants(user_email)
  `;

  // Research article comments (per report slug)
  await sql`
    CREATE TABLE IF NOT EXISTS research_comments (
      id SERIAL PRIMARY KEY,
      article_slug TEXT NOT NULL,
      user_email TEXT NOT NULL,
      username TEXT NOT NULL,
      comment_text TEXT NOT NULL,
      parent_id INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (parent_id) REFERENCES research_comments(id) ON DELETE CASCADE
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_research_comments_slug ON research_comments(article_slug)
  `;

  // Research article likes (per report slug)
  await sql`
    CREATE TABLE IF NOT EXISTS research_likes (
      id SERIAL PRIMARY KEY,
      article_slug TEXT NOT NULL,
      user_email TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(article_slug, user_email)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_research_likes_slug ON research_likes(article_slug)
  `;

  // Create indexes for chat performance
  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_email)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_message_files_message ON chat_message_files(message_id)
  `;

  // Index market structure table (for ES, NQ, YM analysis)
  await sql`
    CREATE TABLE IF NOT EXISTS index_market_structure (
      id SERIAL PRIMARY KEY,
      symbol TEXT UNIQUE NOT NULL,
      daily_structure TEXT,
      weekly_structure TEXT,
      monthly_structure TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  
  // Insert default market structure data if it doesn't exist
  const defaultStructures = [
    { symbol: 'ES', daily: 'Mixed', weekly: 'Consolidating', monthly: null },
    { symbol: 'NQ', daily: 'Bearish', weekly: 'Consolidating', monthly: null },
    { symbol: 'YM', daily: 'Bullish', weekly: 'Bullish', monthly: null },
  ];
  
  for (const struct of defaultStructures) {
    const existing = await sql`
      SELECT id FROM index_market_structure WHERE symbol = ${struct.symbol}
    `;
    
    if (existing.length === 0) {
      await sql`
        INSERT INTO index_market_structure (symbol, daily_structure, weekly_structure, monthly_structure)
        VALUES (${struct.symbol}, ${struct.daily}, ${struct.weekly}, ${struct.monthly})
      `;
    }
  }

  // Insert default chat rooms (upsert - only insert if they don't exist)
  const defaultRooms = [
    { name: 'General', description: 'General trading discussions and market chat', topic: 'general' },
    { name: 'Crypto', description: 'Cryptocurrency discussions and analysis', topic: 'crypto' },
    { name: "Nick's Trades", description: "Nick's trading ideas and analysis", topic: 'nicks-trades' },
    { name: 'Day Trades', description: 'Day trading discussions and live trades', topic: 'day-trades' },
  ];

  for (const room of defaultRooms) {
    const existing = await sql`
      SELECT id FROM chat_rooms WHERE name = ${room.name}
    `;
    
    if (existing.length === 0) {
      await sql`
        INSERT INTO chat_rooms (name, description, topic)
        VALUES (${room.name}, ${room.description}, ${room.topic})
      `;
    }
  }
}


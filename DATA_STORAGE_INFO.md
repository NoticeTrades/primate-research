# Data Storage Information

## Current Setup (Development)

### Where Data is Stored

**User Accounts:**
- Location: `/data/users.json` (in your project root)
- Format: JSON file containing user information
- Contents: Email, hashed passwords, name, username, creation date
- **This file is gitignored** - it won't be committed to your repository

**Trades Data:**
- Location: Browser's `localStorage` (client-side)
- Format: JSON stored in browser
- Contents: Your trade entries and performance data
- **This is stored locally on each user's browser**

### Important Notes

⚠️ **This setup does NOT work automatically when deployed!**

The current file-based storage (`/data/users.json`) will NOT work on most hosting platforms because:
1. File system is read-only on many platforms (Vercel, Netlify, etc.)
2. Data is lost when the server restarts
3. Multiple server instances can't share the same file
4. No data persistence between deployments

## What You Need to Do for Production

### Option 1: Use a Database (Recommended)

**PostgreSQL (Vercel, Railway, Supabase):**
- Free tier available
- Reliable and scalable
- Works with Next.js

**MongoDB (MongoDB Atlas):**
- Free tier available
- Easy to set up
- Good for JSON-like data

**Steps:**
1. Sign up for a database service
2. Get your connection string
3. Update `/app/api/auth/signup/route.ts` and `/app/api/auth/login/route.ts` to use the database instead of the file system
4. Create a users table/collection
5. Deploy!

### Option 2: Use an Authentication Service (Easiest)

**Clerk:**
- Free tier: 10,000 monthly active users
- Handles everything: signup, login, sessions
- Just install and configure
- Website: https://clerk.com

**Supabase Auth:**
- Free tier available
- Includes database + authentication
- Easy integration
- Website: https://supabase.com

**Auth0:**
- Free tier: 7,000 monthly active users
- Enterprise-grade security
- Website: https://auth0.com

### Option 3: Use Vercel KV or Upstash (Simple Key-Value Store)

- Good for simple data
- Works well with Next.js
- Free tier available

## Trades Data Storage

Currently, trades are stored in `localStorage` (browser). For production, you should:

1. **Store trades in a database** - Create a `trades` table/collection
2. **Link trades to user accounts** - Associate each trade with a user ID
3. **Update the trades page** - Fetch from database instead of localStorage

## Migration Steps

When you're ready to deploy:

1. **Choose your solution** (Database or Auth Service)
2. **Set up your database/service**
3. **Update the auth routes** to use your chosen solution
4. **Test locally** with your production database
5. **Deploy** to your hosting platform
6. **Set environment variables** (database connection strings, API keys)

## Environment Variables Needed

Create a `.env.local` file (and `.env` for production):

```env
# Database connection (if using database)
DATABASE_URL=your_database_connection_string

# Or Auth Service keys (if using Clerk/Supabase)
CLERK_SECRET_KEY=your_clerk_key
# or
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## Quick Start with Supabase (Recommended)

1. Sign up at https://supabase.com (free)
2. Create a new project
3. Install: `npm install @supabase/supabase-js`
4. Create a users table in Supabase dashboard
5. Update auth routes to use Supabase client
6. Done! Works automatically when deployed

## Summary

- **Development**: Data stored in `/data/users.json` (local file)
- **Production**: You MUST set up a database or auth service
- **Trades**: Currently in localStorage, should move to database
- **Recommendation**: Use Supabase or Clerk for easiest setup

See `DEPLOYMENT_GUIDE.md` for detailed instructions.

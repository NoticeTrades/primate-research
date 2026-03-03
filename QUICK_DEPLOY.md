# Quick Deployment Guide

## ⚠️ IMPORTANT: Authentication Issue

**The signup/login system will NOT work in production** because it uses file storage (`/data/users.json`) which doesn't work on hosting platforms.

**Quick Fix Options:**
1. **Disable authentication temporarily** - Remove protection from Research/Videos pages
2. **Use a free auth service** - Set up Supabase or Clerk (15 minutes)
3. **Use a database** - PostgreSQL or MongoDB

See `DATA_STORAGE_INFO.md` for details.

## Deploy to Vercel (Recommended - 5 minutes)

### Step 1: Push to GitHub

```bash
# Add all files
git add .

# Commit
git commit -m "Initial deployment"

# Create GitHub repo (if you don't have one)
# Go to https://github.com/new and create a new repository

# Add remote (replace YOUR_USERNAME and YOUR_REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin master
```

### Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Sign up/Login with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js
6. Click "Deploy"
7. Done! Your site will be live in 2-3 minutes

### Step 3: Fix Authentication (Required)

After deployment, authentication won't work. Choose one:

**Option A: Quick Fix - Disable Auth Temporarily**
- Remove auth checks from `/app/research/page.tsx` and `/app/videos/page.tsx`
- Pages will be public

**Option B: Use Supabase (15 minutes)**
1. Sign up at https://supabase.com (free)
2. Create new project
3. Install: `npm install @supabase/supabase-js`
4. Update auth routes to use Supabase
5. Redeploy

## Alternative: Deploy to Netlify

1. Push to GitHub (same as above)
2. Go to https://netlify.com
3. Sign up with GitHub
4. Click "Add new site" → "Import an existing project"
5. Select your repository
6. Build command: `npm run build`
7. Publish directory: `.next`
8. Deploy!

## Environment Variables (if needed)

If you add a database later, add these in Vercel/Netlify dashboard:
- `DATABASE_URL` - Your database connection string
- Or auth service keys (Clerk, Supabase, etc.)

## After Deployment

1. Your site will be at: `https://your-project.vercel.app`
2. You can add a custom domain in Vercel settings
3. Fix authentication (see above)

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment

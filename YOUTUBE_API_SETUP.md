# YouTube API Key Setup

The YouTube API key has been configured in Vercel environment variables.

## Environment Variable
- **Name:** `YOUTUBE_API_KEY`
- **Location:** Vercel Dashboard → Project Settings → Environment Variables

## What it does:
- Fetches view counts for videos on the `/videos` page
- Enables sorting by "Most views" and "Least views"
- Updates automatically when videos are viewed on YouTube

## Security Note:
- The API key is stored as an environment variable in Vercel
- It is NOT committed to the repository
- Only accessible server-side through the `/api/youtube-stats` route

## If you need to update the key:
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Edit `YOUTUBE_API_KEY`
3. Redeploy the project

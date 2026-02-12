# Primate Research - Project Summary

This document provides a comprehensive overview of the Primate Research website project, including all implemented features, architecture, and key files.

## Project Overview

Primate Research is a premium trading and investment research platform built with Next.js, featuring real-time market data, research articles, video content, trading tools, and a comprehensive user engagement system.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Neon Postgres (serverless)
- **Storage**: 
  - Cloudflare R2 (primary for large video files)
  - Vercel Blob (fallback for videos)
- **Authentication**: Cookie-based sessions
- **Email**: Resend
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Key Features Implemented

### 1. User Authentication & Profiles
- **Location**: `/app/api/auth/*`, `/app/login`, `/app/signup`, `/app/verify`
- Email verification system
- Session management with cookies
- **Profile Page** (`/app/profile/page.tsx`):
  - Profile picture upload (base64, ready for R2 migration)
  - Bio editing
  - Saved videos view
  - My comments view
  - Account settings
  - Accessible via username dropdown in navigation

### 2. Notification System
- **Location**: `/app/notifications/page.tsx`, `/app/api/notifications/*`
- Dedicated notifications page with:
  - Individual delete
  - Clear all / Mark all read
  - Filter by type (All, Unread, Article, Update, Video)
  - Browser notification toggle
- Welcome notification for new users
- Real-time updates without page refresh
- Comment reply notifications

### 3. Video System ("The Vault")
- **Location**: `/app/videos/page.tsx`, `/app/components/VideoCard.tsx`
- Support for YouTube and exclusive videos
- Video upload via admin panel (R2 primary, Vercel Blob fallback)
- View count tracking
- Category and source filtering
- **Like, Save, and Comment Features**:
  - Like/unlike videos (heart icon with count)
  - Save videos to profile
  - Comment system with replies
  - Profile pictures in comments
- Video buffering improvements with progress tracking

### 4. Research Articles
- **Location**: `/app/research/*`, `/data/research.ts`
- Structured article viewer with:
  - Intro sections
  - News events table
  - Multiple sections with commentary
  - Chart images with lightbox modal
  - Jump links for navigation
- Latest article section on homepage
- SEO optimized with dynamic metadata

### 5. Crypto Ticker Pages
- **Location**: `/app/ticker/[symbol]/page.tsx`, `/app/api/ticker/[symbol]/route.ts`
- Search by ticker symbol or name (e.g., "Bitcoin", "BTC")
- Autocomplete suggestions
- Four tabs:
  - **Statistics**: Price, market cap, supply, ATH/ATL, description
  - **Research**: Filtered articles mentioning the crypto
  - **Chart**: TradingView widget
  - **Sentiment**: Crypto Fear & Greed Index with visual gauge

### 6. Economic Calendar
- **Location**: `/app/calendar/page.tsx`
- TradingView Economic Calendar widget
- Earnings Calendar tab with sector filters
- Dark theme integration

### 7. Live Trades
- **Location**: `/app/trades/page.tsx`
- Trade performance tracking
- Client-side storage (localStorage)

### 8. Admin Panel
- **Location**: `/app/admin/page.tsx`
- User management
- Notification creation and deletion
- Feedback management
- Video upload and management
- Database setup/initialization

### 9. SEO & Social
- **Location**: `/app/layout.tsx`, `/app/sitemap.ts`, `/app/robots.ts`
- Comprehensive meta tags
- Open Graph images (dynamic generation)
- Twitter cards
- Sitemap generation
- Structured data (JSON-LD)
- Google Search Console integration

### 10. Support & Feedback
- **Location**: `/app/components/FeedbackWidget.tsx`, `/app/api/feedback/route.ts`
- Floating feedback button
- Form submission
- Admin view of all feedback

## Database Schema

**Location**: `/lib/db.ts`

### Tables:
- `users`: User accounts with profile pictures, bio, notification preferences
- `notifications`: Global and user-specific notifications
- `feedback`: User feedback submissions
- `videos`: Video metadata (exclusive videos)
- `video_likes`: User likes on videos
- `saved_videos`: User saved videos
- `video_comments`: Comments with reply support (parent_id for nesting)

### Key Columns:
- `users.profile_picture_url`: Base64 or URL for profile pictures
- `users.bio`: User biography
- `users.browser_notifications_enabled`: Browser notification preference
- `video_comments.parent_id`: Enables nested replies

## API Routes

### Authentication
- `/api/auth/login` - User login
- `/api/auth/signup` - User registration
- `/api/auth/verify` - Email verification (creates welcome notification)
- `/api/auth/logout` - Session termination
- `/api/auth/check` - Check authentication status

### User Profile
- `/api/user/profile` - GET/POST user profile data
- `/api/user/profile-picture` - Upload profile picture
- `/api/user/comments` - Get all user's comments

### Videos
- `/api/videos` - Get all videos
- `/api/videos/add` - Add video metadata to database
- `/api/videos/[id]/view` - Increment view count
- `/api/videos/[id]/like` - GET/POST like status
- `/api/videos/[id]/save` - GET/POST save status
- `/api/videos/[id]/comments` - GET/POST comments
- `/api/videos/[id]/comments/[commentId]` - DELETE comment
- `/api/videos/saved` - Get user's saved videos
- `/api/videos/upload-r2-client` - Generate R2 presigned URL

### Notifications
- `/api/notifications` - GET user notifications
- `/api/notifications/clear` - Clear all notifications
- `/api/notifications/read` - Mark as read
- `/api/notifications/preferences` - Browser notification settings

### Admin
- `/api/admin/notifications` - Admin notification management
- `/api/admin/feedback` - Admin feedback management

### Other
- `/api/feedback` - Submit feedback
- `/api/ticker/[symbol]` - Get crypto data (CoinGecko)
- `/api/youtube-stats` - Get YouTube view counts

## Key Components

### Navigation (`/app/components/Navigation.tsx`)
- Search bar with autocomplete
- Notification bell (redirects to `/notifications`)
- Username dropdown (links to profile)
- "The Jungle" dropdown (Videos, Trades, Calendar)
- X (Twitter) link
- Premium badge

### VideoCard (`/app/components/VideoCard.tsx`)
- Video playback (YouTube iframe or HTML5 video)
- Like, Save, Comment buttons
- View count display
- Description with "Read more"
- Buffering states and progress tracking

### VideoComments (`/app/components/VideoComments.tsx`)
- Comment list with replies
- Profile pictures in comments
- Reply functionality
- Delete own comments
- Character limit (2000)

### FeedbackWidget (`/app/components/FeedbackWidget.tsx`)
- Floating button (bottom right)
- Modal form
- Authentication gating

## Environment Variables

Required in `.env.local` and Vercel:
- `DATABASE_URL` - Neon Postgres connection string
- `RESEND_API_KEY` - Email service
- `YOUTUBE_API_KEY` - (Optional) YouTube view counts
- `R2_ACCOUNT_ID` - Cloudflare R2
- `R2_ACCESS_KEY_ID` - Cloudflare R2
- `R2_SECRET_ACCESS_KEY` - Cloudflare R2
- `R2_BUCKET_NAME` - Cloudflare R2 bucket name
- `R2_PUBLIC_URL` - Cloudflare R2 public URL

## Protected Routes

**Location**: `/middleware.ts`

Routes requiring authentication:
- `/research`
- `/videos`
- `/trades`
- `/ticker`
- `/calendar`
- `/notifications`
- `/profile`

## File Structure Highlights

```
/app
  /api - All API routes
  /components - Reusable components
  /profile - User profile page
  /notifications - Notifications page
  /videos - Videos page (The Vault)
  /research - Research articles
  /ticker - Crypto ticker pages
  /calendar - Economic calendar
  /admin - Admin dashboard
  /login, /signup, /verify - Auth pages

/lib
  db.ts - Database connection and schema

/data
  research.ts - Research article data
  videos.ts - Static video data (YouTube)

/public
  /charts - Chart images for articles
```

## Recent Improvements

1. **Profile System**: Complete profile page with picture upload, bio, saved videos, and comments
2. **Comment System**: Full comment/reply system with profile pictures
3. **Video Engagement**: Like, save, and comment features
4. **Notifications**: Comment reply notifications
5. **UI Fixes**: Z-index issues, profile picture persistence, date formatting

## Known Limitations & Future Enhancements

1. **Profile Pictures**: Currently base64 (should migrate to R2/Blob for better performance)
2. **Video Upload**: Large files (1.26GB+) work but may buffer slowly
3. **Password Change**: Not yet implemented in settings
4. **Email Preferences**: Could add granular notification controls
5. **Social Features**: Could add user following, activity feed

## Setup Instructions

1. Run database setup: Go to `/admin` → Click "Run Setup"
2. Configure environment variables in Vercel
3. Set up Cloudflare R2 (see `CLOUDFLARE_R2_SETUP.md`)
4. Deploy to Vercel

## Important Notes

- All database migrations are idempotent (safe to run multiple times)
- Profile pictures are stored as base64 in database (consider migrating to R2)
- Comments support nested replies via `parent_id`
- Notification system uses both global and user-specific notifications
- Video uploads use R2 as primary, Vercel Blob as fallback
- SEO is fully implemented with dynamic OG images

## Contact & Support

For questions or issues, refer to:
- Admin panel: `/admin`
- Feedback widget: Bottom right of screen
- Database setup: `/admin` → "Run Setup" button

---

**Last Updated**: Current session
**Status**: Production-ready with active development


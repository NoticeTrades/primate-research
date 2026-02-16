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
  - **User Badge Display**: Gold "Founder" badge for `noticetrades`, blue "PREMIUM" for others

### 2. Notification System
- **Location**: `/app/notifications/page.tsx`, `/app/api/notifications/*`
- Dedicated notifications page with:
  - Individual delete (trash icon)
  - Clear all / Mark all read
  - Filter by type (All, Unread, Article, Update, Video, Comment Reply)
  - Browser notification toggle
  - **Sound notification toggle** (plays gentle ding sound for new notifications)
- Welcome notification for new users (sent to notification hub upon email verification)
- Real-time updates without page refresh (5-second polling, visibility listeners)
- **Comment reply notifications**:
  - Green accent color and glow effect for visibility
  - Auto-redirect to video comment section when clicked
  - Sound notification support
- Notification bell in navigation (does NOT auto-mark as read)
- Cross-component communication via custom events for badge updates

### 3. Video System ("The Vault")
- **Location**: `/app/videos/page.tsx`, `/app/components/VideoCard.tsx`
- Support for YouTube and exclusive videos
- Video upload via admin panel (R2 primary, Vercel Blob fallback)
- View count tracking
- Category and source filtering (YouTube/Exclusive)
- **Like, Save, and Comment Features**:
  - Like/unlike videos (heart icon with count)
  - Save videos to profile
  - **Comment system with nested replies** (Reddit-style):
    - Top-level comments with unlimited nested replies
    - Collapsible threads for long discussions
    - Visual hierarchy (smaller avatars/text for replies)
    - "Show/Hide X replies" buttons
    - Profile pictures in comments
    - User badges (Founder/Premium) in comments
  - Character limit (2000)
- Video buffering improvements with progress tracking
- Auto-open comment section from notification links (URL params: `?videoId=X&openComments=true`)

### 4. Research Articles
- **Location**: `/app/research/*`, `/data/research.ts`
- Structured article viewer with:
  - Intro sections
  - News events table
  - Multiple sections with commentary
  - Chart images with lightbox modal (click to enlarge)
  - Jump links for navigation
- Latest article section on homepage (auto-updates when new reports added)
- SEO optimized with dynamic metadata
- Authentication gating (prompts signup/login for non-members)

### 5. Crypto Ticker Pages
- **Location**: `/app/ticker/[symbol]/page.tsx`, `/app/api/ticker/[symbol]/route.ts`
- Search by ticker symbol or name (e.g., "Bitcoin", "BTC")
- Autocomplete suggestions in search bar
- Four tabs:
  - **Statistics**: Price, market cap, supply, ATH/ATL, description
  - **Research/Articles**: Filtered articles mentioning the crypto
  - **Chart**: TradingView widget
  - **Sentiment**: Crypto Fear & Greed Index with visual gauge (Alternative.me API)

### 6. Economic Calendar
- **Location**: `/app/calendar/page.tsx`
- TradingView Economic Calendar widget
- Earnings Calendar tab with sector filters (Tech, Banking, etc.)
- Dark theme integration (background: #131722)
- Interactive filters (impact level, country, week navigation)

### 7. Live Trades
- **Location**: `/app/trades/page.tsx`
- Trade performance tracking
- Client-side storage (localStorage)
- S&P 500 comparison

### 8. Admin Panel
- **Location**: `/app/admin/page.tsx`
- User management
- Notification creation and deletion
- **Clear all notifications** button (with confirmation)
- Feedback management
- Video upload and management (R2/Blob)
- Database setup/initialization

### 9. SEO & Social
- **Location**: `/app/layout.tsx`, `/app/sitemap.ts`, `/app/robots.ts`
- Comprehensive meta tags
- **Dynamic Open Graph images** (blue gradient background with white logo)
- Twitter cards
- Sitemap generation
- Structured data (JSON-LD)
- Google Search Console integration
- Brand keyword optimization ("primate trading", "primatetrading")

### 10. Support & Feedback
- **Location**: `/app/components/FeedbackWidget.tsx`, `/app/api/feedback/route.ts`
- Floating feedback button (bottom right)
- Form submission
- Admin view of all feedback
- Authentication gating (prompts signup for non-members)

### 11. Sound Notifications
- **Location**: `/app/utils/sound.ts`, `/app/components/Navigation.tsx`, `/app/notifications/page.tsx`
- Gentle ding sound for new notifications
- Toggle in notification hub
- Plays once per notification (tracked via `sessionStorage`)
- Persists across page navigations
- Respects user preference (`sound_notifications_enabled` in database)

## Database Schema

**Location**: `/lib/db.ts`

### Tables:
- `users`: User accounts with profile pictures, bio, notification preferences
- `notifications`: Global and user-specific notifications (includes `user_email` column)
- `feedback`: User feedback submissions
- `videos`: Video metadata (exclusive videos)
- `video_likes`: User likes on videos
- `video_comments`: Comments with reply support (parent_id for nesting)
- `saved_videos`: User saved videos

### Key Columns:
- `users.profile_picture_url`: Base64 or URL for profile pictures
- `users.bio`: User biography
- `users.browser_notifications_enabled`: Browser notification preference
- `users.sound_notifications_enabled`: Sound notification preference (default: TRUE)
- `users.user_role`: User role ('owner' for noticetrades, 'premium' for others)
- `users.last_notification_seen`: Timestamp for tracking unread notifications
- `video_comments.parent_id`: Enables nested replies (NULL for top-level)
- `notifications.user_email`: For user-specific notifications
- `notifications.type`: Notification type (article, update, video, comment_reply, etc.)

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
- `/api/videos` - Get all videos (from database and static data)
- `/api/videos/add` - Add video metadata to database
- `/api/videos/[id]/view` - Increment view count
- `/api/videos/[id]/like` - GET/POST like status
- `/api/videos/[id]/save` - GET/POST save status
- `/api/videos/[id]/comments` - GET/POST comments (with nested replies)
- `/api/videos/[id]/comments/[commentId]` - DELETE comment
- `/api/videos/saved` - Get user's saved videos
- `/api/videos/upload-r2-client` - Generate R2 presigned URL
- `/api/videos/upload-url` - Get Vercel Blob upload URL

### Notifications
- `/api/notifications` - GET user notifications (force-dynamic, no cache)
- `/api/notifications/clear` - Clear all notifications
- `/api/notifications/read` - Mark as read
- `/api/notifications/[id]` - DELETE individual notification
- `/api/notifications/preferences` - GET/POST browser and sound notification settings

### Admin
- `/api/admin/notifications` - Admin notification management (create, delete all)
- `/api/admin/feedback` - Admin feedback management

### Other
- `/api/feedback` - Submit feedback
- `/api/ticker/[symbol]` - Get crypto data (CoinGecko)
- `/api/youtube-stats` - Get YouTube view counts

## Key Components

### Navigation (`/app/components/Navigation.tsx`)
- Search bar with autocomplete (crypto tickers and names)
- Notification bell (redirects to `/notifications`, does NOT auto-mark as read)
- Username dropdown (links to profile)
- "The Jungle" dropdown (Videos, Trades, Calendar)
- X (Twitter) link
- **User Badge System**:
  - Gold "Founder" badge for `noticetrades` account (with gold glow effect on hover)
  - Blue "Premium" badge for all other users
  - Badge appears next to username in navigation
- Sound notification support (plays ding for new notifications)
- Cross-component event listener for notification badge updates

### VideoCard (`/app/components/VideoCard.tsx`)
- Video playback (YouTube iframe or HTML5 video)
- Like, Save, Comment buttons
- View count display
- Description with "Read more" button
- Buffering states and progress tracking
- YouTube icon badge for YouTube videos
- No autoplay on hover for YouTube videos

### VideoComments (`/app/components/VideoComments.tsx`)
- **Nested comment system** (Reddit-style):
  - Recursive `CommentThread` component
  - Unlimited nesting depth
  - Collapsible threads for long discussions (auto-collapse if >10 replies or depth >= 5)
  - Visual hierarchy (smaller avatars/text for nested replies)
  - Indentation with border for nested replies
- Profile pictures in comments
- Reply functionality with nested support
- Delete own comments
- Character limit (2000)
- **User Badge Display**: Shows "Founder" (gold) or "PREMIUM" (blue) badges next to usernames
- Format: Username + Badge + Timestamp + Delete button

### ScrollFade (`/app/components/ScrollFade.tsx`)
- **Blue gradient overlay** (full-screen, persistent)
- Smooth transitions (1000ms duration)
- Opacity: 60% at top, increases to 80% on scroll
- Multiple gradient layers for rich blue effect
- Does NOT fade away on scroll (stays visible)

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
- `NEXT_PUBLIC_SITE_URL` - Site URL (for SEO, OG images)

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
  /utils - Utility functions (sound.ts)

/lib
  db.ts - Database connection and schema

/data
  research.ts - Research article data
  videos.ts - Static video data (YouTube)

/public
  /charts - Chart images for articles
```

## Recent Improvements (Latest Session)

1. **Blue Gradient Background**:
   - Restored on all pages (`bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950`)
   - ScrollFade component provides persistent full-screen blue gradient overlay
   - Smooth transitions (1000ms), opacity 60-80%
   - Does NOT fade away on scroll

2. **Comment Reply Notifications**:
   - Green accent color and glow effect in notification hub
   - Auto-redirect to video comment section when clicked
   - URL params: `?videoId=X&openComments=true`
   - Sound notification support

3. **Nested Comment Replies**:
   - Reddit-style nested replies with unlimited depth
   - Collapsible threads for long discussions
   - Visual hierarchy (smaller avatars/text for replies)
   - Recursive `CommentThread` component

4. **Sound Notifications**:
   - Gentle ding sound for new notifications
   - Toggle in notification hub
   - Plays once per notification (tracked via `sessionStorage`)
   - Persists across page navigations

5. **UI/UX Improvements**:
   - Fixed dropdown hover issues (Tools, Notifications filter)
   - Improved notification badge updates (cross-component events)
   - Better video buffering feedback
   - Profile picture persistence fixes

## Known Limitations & Future Enhancements

1. **Profile Pictures**: Currently base64 (should migrate to R2/Blob for better performance)
2. **Video Upload**: Large files (1.26GB+) work but may buffer slowly
3. **Password Change**: Not yet implemented in settings
4. **Email Preferences**: Could add granular notification controls
5. **Social Features**: Could add user following, activity feed
6. **Comment Moderation**: Could add admin moderation tools

## Setup Instructions

1. Run database setup: Go to `/admin` → Click "Run Setup"
2. Configure environment variables in Vercel
3. Set up Cloudflare R2 (see `CLOUDFLARE_R2_SETUP.md`)
4. Deploy to Vercel

## Important Notes

- All database migrations are idempotent (safe to run multiple times)
- Profile pictures are stored as base64 in database (consider migrating to R2)
- Comments support nested replies via `parent_id` (NULL for top-level)
- Notification system uses both global and user-specific notifications
- Video uploads use R2 as primary, Vercel Blob as fallback
- SEO is fully implemented with dynamic OG images (blue gradient background)
- User badge system: Gold for Founder (`noticetrades`), Blue for Premium users
- Badge CSS classes: `.verified-badge` (blue glow), `.founder-badge` (gold glow)
- Sound notifications use Web Audio API (`app/utils/sound.ts`)
- Notification bell does NOT auto-mark as read (user must explicitly mark)
- Blue gradient background is persistent and does not fade on scroll
- Comment replies trigger notifications with sound (if enabled)
- Notification links auto-open video comment sections

## User Role System

- **Owner Role**: Assigned to `noticetrades` username
  - Displays gold "Founder" badge in navigation, profile, and comments
  - Gold glow effect on hover in navigation
- **Premium Role**: Default for all other users
  - Displays blue "PREMIUM" badge
- Role is stored in `users.user_role` column
- Badge logic checks both `username === 'noticetrades'` and `userRole === 'owner'`

## Notification System Details

- **Types**: article, update, video, comment_reply
- **Delivery**: In-app notification hub (real-time, no refresh needed)
- **Browser Notifications**: Optional, toggle in notification hub
- **Sound Notifications**: Optional, toggle in notification hub
- **Welcome Notification**: Sent automatically to new users upon email verification
- **Comment Reply Notifications**: 
  - Created when user replies to another user's comment
  - Green accent styling in notification hub
  - Auto-redirects to video comment section
  - Includes sound notification (if enabled)
- **Filtering**: By type (All, Unread, Article, Update, Video, Comment Reply)
- **Actions**: Delete individual, clear all, mark all read

## Comment System Details

- **Nested Replies**: Unlimited depth, Reddit-style
- **Collapsible Threads**: Auto-collapse if >10 replies or depth >= 5
- **Visual Hierarchy**: Smaller avatars/text for nested replies
- **User Badges**: Founder (gold) or Premium (blue) displayed in comments
- **Notifications**: Users notified when someone replies to their comment
- **Auto-Open**: Notification links auto-open video comment section

## Blue Gradient Background

- **Page Background**: `bg-gradient-to-b from-zinc-950 via-blue-950/50 to-zinc-950`
- **ScrollFade Overlay**: Full-screen blue gradient (60-80% opacity)
- **Smooth Transitions**: 1000ms duration, ease-out
- **Persistent**: Does NOT fade away on scroll
- **Applied to**: All pages (homepage, research, videos, trades, calendar, notifications, ticker, profile)

---

**Last Updated**: February 2025
**Status**: Production-ready with active development
**GitHub**: https://github.com/NoticeTrades/primate-research

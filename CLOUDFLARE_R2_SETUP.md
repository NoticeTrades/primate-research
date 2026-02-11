# Cloudflare R2 Setup Guide

Cloudflare R2 is now integrated as the primary video storage solution. It supports unlimited file sizes and offers 10GB free storage with no egress fees.

## Setup Steps

### Step 1: Create Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the left sidebar
3. Click **Create bucket**
4. Enter a bucket name (e.g., `primate-trading-videos`)
5. Click **Create bucket**

### Step 2: Get R2 Credentials

1. In the R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Select your bucket
4. Set permissions:
   - **Object Read & Write** (for uploads)
   - **Object Read** (for public access)
5. Click **Create API Token**
6. **Save these credentials** (you won't see them again):
   - **Account ID** (found in R2 dashboard URL or account settings)
   - **Access Key ID**
   - **Secret Access Key**

### Step 3: Configure Public Access (Optional but Recommended)

1. In your R2 bucket, go to **Settings**
2. Under **Public Access**, click **Allow Access**
3. Note your public URL (e.g., `https://pub-xxxxx.r2.dev/bucket-name`)

**OR** set up a custom domain:
1. Go to **Settings** → **Custom Domain**
2. Add your domain (e.g., `videos.primatetrading.com`)
3. Follow DNS setup instructions

### Step 4: Add Environment Variables

Add these to your Vercel project:

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add the following:

```
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=primate-trading-videos
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev/primate-trading-videos
```

**OR** if using custom domain:

```
R2_PUBLIC_URL=https://videos.primatetrading.com
```

### Step 5: Redeploy

After adding environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for deployment to complete

## How It Works

- **Primary**: Cloudflare R2 (unlimited file size, 10GB free)
- **Fallback**: Vercel Blob (if R2 not configured, uses Vercel Blob)

The system automatically:
1. Tries R2 first
2. Falls back to Vercel Blob if R2 isn't configured
3. Works with existing Vercel Blob videos (no migration needed)

## File Size Limits

- **Cloudflare R2**: No practical limit (tested up to 5GB+)
- **Vercel Blob Free**: 500MB per file
- **Vercel Blob Pro**: 4.5GB per file

## Pricing

**Cloudflare R2 Free Tier:**
- 10GB storage
- 1M Class A operations/month
- Unlimited Class B operations
- **No egress fees** (unlike AWS S3)

**After Free Tier:**
- $0.015/GB storage
- $4.50/TB Class A operations
- Free Class B operations
- **No egress fees**

## Troubleshooting

**Error: "R2 not configured"**
- Check that all environment variables are set in Vercel
- Make sure you redeployed after adding variables

**Error: "Failed to upload to R2"**
- Check R2 bucket permissions
- Verify API token has correct permissions
- Check bucket name matches `R2_BUCKET_NAME`

**Videos not loading**
- Verify `R2_PUBLIC_URL` is correct
- Check bucket public access is enabled
- Verify CORS settings if needed

## Migration from Vercel Blob

**No migration needed!** Existing Vercel Blob videos will continue to work. New uploads will use R2 automatically.


# Vercel Blob Setup Guide

## Quick Setup (5 minutes)

### Step 1: Create Vercel Blob Store

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project (primate-research)
3. Go to **Storage** tab (in the left sidebar)
4. Click **Create Database** or **Create Store**
5. Select **Blob** from the options
6. Give it a name (e.g., "primate-videos")
7. Click **Create**

### Step 2: Get Your Token

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. You should see `BLOB_READ_WRITE_TOKEN` automatically added
3. If not, go to **Storage** → Your Blob store → **Settings**
4. Copy the `BLOB_READ_WRITE_TOKEN`

### Step 3: Add Environment Variable

1. In Vercel dashboard: **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: (paste your token from Step 2)
   - **Environment**: Production, Preview, Development (check all)
3. Click **Save**

### Step 4: Redeploy

1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### Step 5: Test Upload

1. Go to `/admin` on your site
2. Scroll to **"Upload Video to The Vault"** section
3. Upload a test video
4. If successful, you'll see a green success message!

---

## Pricing

- **Free Tier**: 1GB storage, 100GB bandwidth/month
- **Paid**: $0.15/GB storage, $0.15/GB bandwidth

For most use cases, the free tier is plenty to start!

---

## Troubleshooting

**Error: "Vercel Blob not configured"**
- Make sure `BLOB_READ_WRITE_TOKEN` is set in Vercel
- Make sure you've created a Blob store
- Redeploy after adding the environment variable

**Error: "Upload failed"**
- Check file size (max 500MB per video)
- Check file type (must be a video file)
- Check Vercel Blob storage limits

**Video uploaded but not showing in The Vault**
- Check the browser console for errors
- Verify the video was added to `/data/videos.ts`
- Make sure the video URL is accessible

---

## Next Steps

Once set up, you can:
1. Upload videos directly from `/admin`
2. Videos automatically appear in The Vault
3. Users can filter by category
4. Exclusive videos are marked with a badge

Happy uploading! 🎬


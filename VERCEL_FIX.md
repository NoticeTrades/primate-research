# Fixing Vercel 404 Error

## The Problem
Both your custom domain AND Vercel default URL return 404, even though the build succeeds.

## Solution Steps

### Step 1: Check Vercel Project Settings

1. Go to Vercel Dashboard → Your Project → **Settings**
2. Click **"General"** tab
3. Verify these settings:

**Framework Preset:** Should be `Next.js` (auto-detected)
**Root Directory:** Should be `./` (leave empty or set to `./`)
**Build Command:** Should be `npm run build` (or leave empty - Vercel auto-detects)
**Output Directory:** Should be **EMPTY** (don't set this!)
**Install Command:** Should be `npm install` (or leave empty)

### Step 2: Delete and Re-import Project

Sometimes Vercel gets confused. Try this:

1. In Vercel dashboard, go to your project
2. Click **Settings** → Scroll down → **Delete Project**
3. Confirm deletion
4. Click **"Add New Project"** again
5. Import `primate-research` repository
6. **IMPORTANT:** Make sure it shows "Framework Preset: Next.js"
7. Click **"Deploy"**

### Step 3: Check Deployment Logs

After redeploying, check:
1. **Build Logs** - Should show successful build
2. **Runtime Logs** - Check for any runtime errors
3. **Function Logs** - Check API routes

### Step 4: Verify the Deployment

After deployment completes:
1. Click on the deployment
2. Check the **"Overview"** tab
3. Look for the **"Visit"** button - click it
4. This should open your site

### Step 5: If Still 404

Try accessing:
- `https://your-project.vercel.app/` (with trailing slash)
- `https://your-project.vercel.app` (without trailing slash)

Sometimes one works and the other doesn't.

## Common Causes

1. **Wrong Framework Detection** - Vercel thinks it's a different framework
2. **Output Directory Set** - Should be empty for Next.js
3. **Build Command Wrong** - Should auto-detect
4. **Cached Deployment** - Old broken deployment

## Quick Fix: Force Redeploy

1. Make a small change (add a space to README.md)
2. Commit and push
3. Vercel will auto-deploy
4. Check if it works

Let me know what you see in the Vercel project settings!

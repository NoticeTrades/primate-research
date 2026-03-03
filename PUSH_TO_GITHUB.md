# Push Code to GitHub - Quick Guide

## Step 1: Create Personal Access Token

1. Go to **https://github.com/settings/tokens**
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name: `primate-research-deploy`
4. Select expiration: **90 days** (or No expiration if you prefer)
5. Check these permissions:
   - ✅ `repo` (Full control of private repositories)
6. Click **"Generate token"**
7. **COPY THE TOKEN** (you won't see it again!)

## Step 2: Push Your Code

Run these commands in your terminal:

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/NoticeTrades/primate-research.git
git push -u origin main
```

Replace `YOUR_TOKEN` with the token you just copied.

**OR** when it asks for password, use the token as the password.

## Alternative: Use GitHub Desktop (Easier)

1. Download GitHub Desktop: https://desktop.github.com
2. Sign in with your GitHub account
3. File → Clone Repository → Select `primate-research`
4. It will clone to a folder
5. Copy your project files to that folder
6. Commit and push from GitHub Desktop

## After Pushing

Once code is on GitHub, go back to Vercel and:
1. Click "Redeploy" or "Deploy" again
2. It should work now!

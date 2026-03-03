# Get Your Live URL - Step by Step

## Quick Deployment to Get a Live URL

### Step 1: Create GitHub Repository (2 minutes)

1. Go to **https://github.com/new**
2. Repository name: `primate-research` (or any name you want)
3. **Don't** check "Initialize with README"
4. Click **"Create repository"**
5. Copy the repository URL (looks like: `https://github.com/YOUR_USERNAME/primate-research.git`)

### Step 2: Push Your Code to GitHub

Run these commands (replace with your actual GitHub URL):

```bash
git remote add origin https://github.com/YOUR_USERNAME/primate-research.git
git branch -M main
git push -u origin main
```

Or if you already have a remote:
```bash
git push -u origin master
```

### Step 3: Deploy to Vercel (Gets You Live URL Instantly)

1. Go to **https://vercel.com**
2. Click **"Sign Up"** (use GitHub to sign in - it's easiest)
3. Click **"Add New Project"**
4. Click **"Import"** next to your GitHub repository
5. Vercel will auto-detect Next.js settings
6. Click **"Deploy"**
7. Wait 2-3 minutes

**🎉 Your site will be live at: `https://your-project-name.vercel.app`**

This URL works immediately and people can access it!

### Step 4: Add Custom Domain (Optional - Makes It Searchable)

After deployment:

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Domains"**
3. Enter your domain (e.g., `primate-research.com`)
4. Follow the DNS setup instructions
5. Vercel will handle SSL certificates automatically

**Popular Domain Providers:**
- Namecheap: https://namecheap.com (~$10/year)
- Google Domains: https://domains.google (~$12/year)
- Cloudflare: https://cloudflare.com (~$8/year)

### Alternative: Use Vercel's Free Subdomain

Vercel gives you a free URL like:
- `primate-research.vercel.app`
- `your-project.vercel.app`

This works immediately and is searchable on Google!

## What You Get

✅ **Live URL** - Works immediately after deployment
✅ **HTTPS** - Secure connection (automatic)
✅ **Fast** - Global CDN
✅ **Free** - Vercel free tier is generous
✅ **Auto-updates** - Every time you push to GitHub, site updates automatically

## After Deployment

1. Share your URL: `https://your-project.vercel.app`
2. People can search for it on Google
3. Add to Google Search Console to improve SEO
4. Add custom domain later if you want

## Need Help?

If you get stuck, I can help you:
- Set up the GitHub repository
- Push your code
- Deploy to Vercel
- Configure a custom domain

Just let me know!

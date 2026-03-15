# Fixing Custom Domain 404 Error

## Your Domain: primatetrading.com

The 404 error is likely due to domain configuration. Here's how to fix it:

## Step 1: Verify Domain in Vercel

1. Go to your Vercel dashboard
2. Click on your project (`primate-research`)
3. Go to **Settings** → **Domains**
4. Check if `primatetrading.com` is listed
5. If not, add it:
   - Click "Add Domain"
   - Enter: `primatetrading.com`
   - Also add: `www.primatetrading.com` (optional but recommended)

## Step 2: Check DNS Configuration

Vercel will show you DNS records to add. Make sure these are set in your domain provider:

**Required DNS Records:**
- **A Record** or **CNAME Record** pointing to Vercel
- Vercel will show you the exact values

**Common Setup:**
- `@` (root) → Points to Vercel's IP or CNAME
- `www` → Points to Vercel's CNAME

## Step 3: Wait for DNS Propagation

- DNS changes can take 24-48 hours to fully propagate
- Usually works within 1-2 hours
- Check status in Vercel dashboard

## Step 4: Verify SSL Certificate

- Vercel automatically provisions SSL certificates
- Check in Vercel dashboard → Domains → SSL status
- Should show "Valid" once DNS is configured

## Step 5: Check Domain Provider Settings

Where did you buy the domain? (Namecheap, GoDaddy, etc.)
- Make sure nameservers are set correctly
- Or DNS records are pointing to Vercel

## Quick Test

Try visiting:
- `https://primatetrading.com` (should work)
- `https://www.primatetrading.com` (if you added www)

If one works but not the other, it's a DNS configuration issue.

## Common Issues

1. **DNS not propagated yet** - Wait 1-2 hours
2. **Wrong DNS records** - Check Vercel dashboard for correct values
3. **Nameservers not updated** - Update at your domain provider
4. **Domain not added in Vercel** - Add it in project settings

## Need Help?

Share:
1. Where you bought the domain (Namecheap, GoDaddy, etc.)
2. What DNS records you've added
3. What Vercel shows in the Domains section

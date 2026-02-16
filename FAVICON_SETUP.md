# Setting Up Your Favicon

I've updated the code to use your Primate Trading logo as the favicon. However, for best results, you should also replace the `app/favicon.ico` file.

## Option 1: Quick Fix (Already Done)
The code now points to `/primate-logo.png` as the favicon. This should work, but `.ico` files are preferred for better browser compatibility.

## Option 2: Convert Your Logo to .ico (Recommended)

1. **Convert your logo:**
   - Go to https://convertio.co/png-ico/ or https://www.favicon-generator.org/
   - Upload your `primate-logo.png` from the `public` folder
   - Download the `.ico` file

2. **Replace the favicon:**
   - Delete `app/favicon.ico`
   - Save the new `.ico` file as `app/favicon.ico`
   - Or save it as `app/icon.ico` (Next.js will auto-detect it)

3. **Push to GitHub:**
   ```bash
   git add app/favicon.ico
   git commit -m "Update favicon to Primate Trading logo"
   git push origin main
   ```

## Option 3: Use Multiple Sizes (Best for All Devices)

Create these files in the `app` directory:
- `icon.png` (512x512 or 1024x1024)
- `icon.ico` (16x16, 32x32, 48x48)

Next.js will automatically use these for different devices and contexts.

## After Updating

1. Clear your browser cache (Ctrl+Shift+Delete)
2. Hard refresh the page (Ctrl+F5)
3. The new favicon should appear in the browser tab

The favicon might take a few minutes to update on Vercel after you push the changes.

# How to Add Images to Your Website

## Step-by-Step Instructions

### 1. Locate Your Project Folder
Your project is located at: `C:\Users\golds\Desktop\project-website`

### 2. Add the Logo Image

1. **Find your Primate Trading logo file** (the monkey head logo)
   - It can be in PNG, JPG, or SVG format
   
2. **Copy the logo file** to the `public` folder:
   - Navigate to: `C:\Users\golds\Desktop\project-website\public\`
   - Paste your logo file there
   - **Rename it to one of these names** (the code will try these in order):
     - `primate-logo.png` (preferred)
     - `primate-logo.jpg`
     - `primate-logo.svg`
     - `logo.png`
     - `logo.jpg`

### 3. Add Your Profile Picture

1. **Find your headshot photo** (Nick Thomas photo)
   - It can be in JPG or PNG format
   
2. **Copy the photo** to the `public` folder:
   - Navigate to: `C:\Users\golds\Desktop\project-website\public\`
   - Paste your photo there
   - **Rename it to one of these names** (the code will try these in order):
     - `nick-headshot.jpg` (preferred)
     - `nick-headshot.png`
     - `nick-thomas.jpg`
     - `nick-thomas.png`
     - `headshot.jpg`
     - `headshot.png`

### 4. Featured Research Charts (Homepage)

To show the RKLB and Solana charts in the "Featured Research" section on the homepage:

1. Save your chart screenshots (e.g. from your broker or Yahoo Finance) as:
   - **RKLB 1-year chart** → `rklb-chart.png`
   - **SOL-USD 5-year chart** → `sol-chart.png`
2. Copy both files into the `public` folder.  
If either file is missing, that card will still show but without the chart image.

### 5. Verify the Files

After adding the images, your `public` folder should look something like this:
```
public/
  ├── primate-logo.png  (your logo)
  ├── nick-headshot.jpg (your photo)
  ├── rklb-chart.png    (optional – RKLB chart for Featured Research)
  ├── sol-chart.png     (optional – Solana chart for Featured Research)
  ├── file.svg
  ├── globe.svg
  └── ... (other files)
```

### 6. Restart Your Development Server

After adding the images:
1. Stop your development server (if running) by pressing `Ctrl+C` in the terminal
2. Start it again with: `npm run dev`
3. Refresh your browser

## Quick Method (Using File Explorer)

1. Open File Explorer
2. Navigate to: `C:\Users\golds\Desktop\project-website\public`
3. Drag and drop your logo and profile picture into this folder
4. Right-click each file → Rename to match the preferred names above

## Troubleshooting

- **If images still don't show**: Make sure the file names match exactly (case-sensitive)
- **If you see "P" or "NT" placeholders**: The images haven't loaded yet - check the file names and paths
- **Supported formats**: PNG, JPG, SVG for logo; PNG, JPG for profile picture

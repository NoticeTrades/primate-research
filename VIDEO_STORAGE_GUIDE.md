# Video Storage Guide for The Vault

## ⚠️ Why You Can't Just Upload to a Folder

**You cannot simply upload videos to the `public/videos/` folder** for several reasons:

1. **Vercel File Size Limits**
   - Maximum file size: ~4.5MB per file
   - Videos are typically 50MB-500MB+ each
   - Your deployment will fail if files are too large

2. **Git Repository Limits**
   - GitHub has a 100MB file size limit
   - Large video files will bloat your repository
   - Slow clone/pull times for everyone

3. **Build Time & Performance**
   - Large files slow down builds
   - Users have to download entire videos even if they don't watch
   - No video streaming/optimization

4. **Storage Costs**
   - Vercel's free tier has limited storage
   - Video hosting is expensive on general hosting

## ✅ Recommended Solutions

### Option 1: Vercel Blob Storage (Easiest - Recommended)

**Best for:** Quick setup, integrated with Vercel

**Pricing:**
- Free tier: 1GB storage, 100GB bandwidth/month
- Paid: $0.15/GB storage, $0.15/GB bandwidth

**Setup Steps:**

1. **Install Vercel Blob:**
```bash
npm install @vercel/blob
```

2. **Add to Vercel Dashboard:**
   - Go to your Vercel project
   - Settings → Storage → Create Database/Store
   - Select "Blob" → Create

3. **Get your token:**
   - Settings → Storage → Your Blob store
   - Copy the `BLOB_READ_WRITE_TOKEN`

4. **Add to environment variables:**
   - In Vercel: Settings → Environment Variables
   - Add: `BLOB_READ_WRITE_TOKEN=your_token_here`

5. **Create upload API route** (`app/api/videos/upload/route.ts`):
```typescript
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

6. **Use the URL in your video data:**
```typescript
{
  title: 'My Exclusive Video',
  videoUrl: 'https://your-blob-url.vercel-storage.com/video.mp4',
  videoType: 'exclusive',
  isExclusive: true,
  // ...
}
```

---

### Option 2: Cloudflare R2 (Cheapest - Best Value)

**Best for:** Cost-effective, high performance, no egress fees

**Pricing:**
- Free tier: 10GB storage, 1M Class A operations/month
- Paid: $0.015/GB storage (very cheap!)

**Setup Steps:**

1. **Sign up for Cloudflare:**
   - Go to https://dash.cloudflare.com
   - R2 → Create bucket

2. **Get credentials:**
   - R2 → Manage R2 API Tokens
   - Create API token

3. **Install Cloudflare SDK:**
```bash
npm install @aws-sdk/client-s3
```

4. **Add environment variables:**
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

5. **Create upload API route:**
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `videos/${Date.now()}-${file.name}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
      })
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

---

### Option 3: AWS S3 (Industry Standard)

**Best for:** Enterprise-grade, widely supported

**Pricing:**
- Free tier: 5GB storage, 20,000 GET requests/month (12 months)
- Paid: ~$0.023/GB storage + bandwidth costs

**Setup:**
Similar to Cloudflare R2, but uses AWS SDK.

---

### Option 4: Mux (Video-First Platform)

**Best for:** Professional video hosting with streaming, analytics, thumbnails

**Pricing:**
- Free tier: 50GB storage, 100GB streaming/month
- Paid: $0.015/GB storage, $0.005/GB streaming

**Benefits:**
- Automatic video encoding/optimization
- Adaptive bitrate streaming
- Automatic thumbnail generation
- Analytics built-in
- Best user experience

---

## 📝 How to Add Videos (Once Storage is Set Up)

### Method 1: Admin Panel Upload (Recommended)

I can create an admin upload interface where you:
1. Go to `/admin`
2. Click "Upload Video"
3. Select file, fill in title/description/category
4. Video uploads to cloud storage
5. Automatically added to The Vault

### Method 2: Manual Upload + Add to Data File

1. **Upload video to your cloud storage** (via dashboard or API)
2. **Copy the public URL**
3. **Add to `/data/videos.ts`**:
```typescript
{
  title: 'My Exclusive Video',
  description: 'Description here',
  videoUrl: 'https://your-storage-url.com/video.mp4',
  videoType: 'exclusive',
  category: 'market-analysis',
  isExclusive: true,
  thumbnailUrl: 'https://your-storage-url.com/thumbnail.jpg',
  date: 'Jan 2025',
  duration: '15:30',
}
```

---

## 🎬 Recommended Workflow

1. **Choose Vercel Blob** (easiest) or **Cloudflare R2** (cheapest)
2. **Set up storage** (follow steps above)
3. **I'll create an admin upload interface** for you
4. **Upload videos** through admin panel
5. **Videos automatically appear** in The Vault

---

## 💡 Quick Start Recommendation

**For now, I recommend:**
1. **Vercel Blob** - Easiest setup, works immediately
2. **Later, migrate to Cloudflare R2** if you need more storage/bandwidth

Would you like me to:
- Set up Vercel Blob integration?
- Create an admin upload interface?
- Set up Cloudflare R2 instead?

Let me know which option you prefer!



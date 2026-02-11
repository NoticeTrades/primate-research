'use client';

import { useState } from 'react';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  created_at: string;
}

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Notify state
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyDesc, setNotifyDesc] = useState('');
  const [notifyLink, setNotifyLink] = useState('');
  const [notifyStatus, setNotifyStatus] = useState('');
  const [notifySending, setNotifySending] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Bell notification state
  const [bellTitle, setBellTitle] = useState('');
  const [bellDesc, setBellDesc] = useState('');
  const [bellLink, setBellLink] = useState('');
  const [bellType, setBellType] = useState('update');
  const [bellStatus, setBellStatus] = useState('');
  const [bellSending, setBellSending] = useState(false);

  // Delete all notifications state
  const [deleteStatus, setDeleteStatus] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<{ id: number; user_email: string; username: string; category: string; message: string; created_at: string }[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackLoaded, setFeedbackLoaded] = useState(false);

  // Video upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoCategory, setVideoCategory] = useState<'market-analysis' | 'trading-strategies' | 'educational' | 'live-trading' | 'market-structure' | 'risk-management'>('educational');
  const [videoDate, setVideoDate] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoStatus, setVideoStatus] = useState('');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState('');
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState('');

  // DB setup state
  const [dbStatus, setDbStatus] = useState('');

  // Video management state
  const [videosList, setVideosList] = useState<{ id: number; title: string; videoUrl: string; created_at: string }[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [deleteVideoId, setDeleteVideoId] = useState<number | null>(null);
  const [deleteVideoStatus, setDeleteVideoStatus] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/users?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unauthorized');
        return;
      }
      setUsers(data.users);
      setTotalUsers(data.total);
      setIsAuthed(true);
    } catch {
      setError('Failed to connect. Is DATABASE_URL configured?');
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setTotalUsers(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSetupDb = async () => {
    setDbStatus('Setting up...');
    try {
      const res = await fetch('/api/db-setup');
      const data = await res.json();
      if (res.ok) {
        setDbStatus('Database tables created successfully!');
      } else {
        setDbStatus(`Error: ${data.error}`);
      }
    } catch {
      setDbStatus('Failed to connect to database.');
    }
  };

  const createBellNotification = async (title: string, description: string, link: string, type: string) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, link, type, secret }),
      });
    } catch {
      // silently fail — email is the primary channel
    }
  };

  const handleNotify = async () => {
    if (!notifyTitle.trim()) {
      setNotifyStatus('Title is required');
      return;
    }
    setNotifySending(true);
    setNotifyStatus('');
    try {
      // Always create a bell notification for new articles/reports
      await createBellNotification(
        notifyTitle.trim(),
        notifyDesc.trim(),
        notifyLink.trim() || '/research',
        'article'
      );

      // Optionally send email to all subscribers
      if (sendEmail) {
        const res = await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: notifyTitle.trim(),
            description: notifyDesc.trim(),
            secret,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setNotifyStatus(`Bell notification created + ${data.sent}/${data.total} emails sent.`);
        } else {
          setNotifyStatus(`Bell created, but email error: ${data.error}`);
        }
      } else {
        setNotifyStatus('Bell notification created (no emails sent).');
      }
      setNotifyTitle('');
      setNotifyDesc('');
      setNotifyLink('');
    } catch {
      setNotifyStatus('Failed to send notifications.');
    } finally {
      setNotifySending(false);
    }
  };

  const handleBellOnly = async () => {
    if (!bellTitle.trim()) {
      setBellStatus('Title is required');
      return;
    }
    setBellSending(true);
    setBellStatus('');
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bellTitle.trim(),
          description: bellDesc.trim(),
          link: bellLink.trim() || null,
          type: bellType,
          secret,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBellStatus('Bell notification created!');
        setBellTitle('');
        setBellDesc('');
        setBellLink('');
      } else {
        setBellStatus(`Error: ${data.error}`);
      }
    } catch {
      setBellStatus('Failed to create notification.');
    } finally {
      setBellSending(false);
    }
  };

  const fetchFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const res = await fetch(`/api/admin/feedback?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      if (res.ok) {
        setFeedbackList(data.feedback || []);
        setFeedbackLoaded(true);
      }
    } catch {
      // ignore
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleDeleteAllFeedback = async () => {
    if (!confirm('Delete all feedback? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      if (res.ok) {
        setFeedbackList([]);
      }
    } catch {
      // ignore
    }
  };

  const fetchVideos = async () => {
    setVideosLoading(true);
    setDeleteVideoStatus('');
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();
        // Map videos with IDs from the API response
        const videosWithIds = data.videos
          .filter((v: any) => v.id) // Only include videos with database IDs
          .map((v: any) => ({
            id: v.id,
            title: v.title,
            videoUrl: v.videoUrl,
            created_at: v.createdAt || new Date().toISOString(),
          }));
        setVideosList(videosWithIds);
        setVideosLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setVideosLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (deleteVideoId !== videoId) {
      setDeleteVideoId(videoId);
      setDeleteVideoStatus('Click again to confirm deletion');
      setTimeout(() => {
        setDeleteVideoId(null);
        setDeleteVideoStatus('');
      }, 4000);
      return;
    }

    setDeleteVideoStatus('Deleting...');
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteVideoStatus(data.message || 'Video deleted successfully');
        // Refresh videos list
        await fetchVideos();
        setDeleteVideoId(null);
      } else {
        setDeleteVideoStatus(`Error: ${data.error || 'Failed to delete video'}`);
      }
    } catch (error: any) {
      setDeleteVideoStatus(`Error: ${error.message || 'Failed to delete video'}`);
    }
  };

  const handleVideoUpload = async () => {
    if (!videoFile) {
      setVideoStatus('Error: Please select a video file');
      return;
    }
    if (!videoTitle.trim() || !videoDescription.trim()) {
      setVideoStatus('Error: Title and description are required');
      return;
    }

    // Validate file size
    // Cloudflare R2: No file size limit (practical limit ~5GB)
    // Vercel Blob limits: Free tier = 500MB, Pro tier = 4.5GB
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB (practical limit for R2)
    
    if (videoFile.size > maxSize) {
      const fileSizeGB = (videoFile.size / (1024 * 1024 * 1024)).toFixed(2);
      setVideoStatus(`Error: Video file too large. Maximum size is 5GB. Your file is ${fileSizeGB}GB.`);
      return;
    }

    setVideoUploading(true);
    setVideoStatus('Uploading video...');

    try {
      // Try Cloudflare R2 first (preferred for large files)
      let videoUrl = '';
      let thumbnailUrl = '';

      // Step 1: Get R2 presigned URL for upload
      const r2Res = await fetch('/api/videos/upload-r2-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: videoFile.name,
          contentType: videoFile.type,
          fileSize: videoFile.size,
        }),
      });

      if (r2Res.ok) {
        // Use R2 for upload
        const r2Data = await r2Res.json();
        
        setVideoStatus('Uploading video to Cloudflare R2... (This may take 10-30 minutes for large files)');
        
        // Add timeout warning after 2 minutes
        const timeoutWarning = setTimeout(() => {
          setVideoStatus('Uploading video to R2... (Large file - this is normal, please wait)');
        }, 120000); // 2 minutes

        try {
          // Upload video to R2 using presigned URL
          const uploadRes = await fetch(r2Data.presignedUrl, {
            method: 'PUT',
            body: videoFile,
            headers: {
              'Content-Type': videoFile.type,
            },
          });

          if (!uploadRes.ok) {
            throw new Error('Failed to upload to R2');
          }

          videoUrl = r2Data.publicUrl;
          clearTimeout(timeoutWarning);

          // Upload thumbnail if provided
          if (thumbnailFile && thumbnailFile.size > 0) {
            setVideoStatus('Uploading thumbnail to R2...');
            const thumbnailR2Res = await fetch('/api/videos/upload-r2-client', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: thumbnailFile.name,
                contentType: thumbnailFile.type,
                fileSize: thumbnailFile.size,
              }),
            });

            if (thumbnailR2Res.ok) {
              const thumbnailR2Data = await thumbnailR2Res.json();
              const timestamp = Date.now();
              const sanitizedName = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
              const thumbnailFileName = `videos/thumbnails/${timestamp}-${sanitizedName.replace(/\.[^/.]+$/, '')}.jpg`;
              
              // Get presigned URL for thumbnail
              const thumbR2Res = await fetch('/api/videos/upload-r2-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  filename: thumbnailFileName,
                  contentType: thumbnailFile.type,
                  fileSize: thumbnailFile.size,
                }),
              });

              if (thumbR2Res.ok) {
                const thumbR2Data = await thumbR2Res.json();
                await fetch(thumbR2Data.presignedUrl, {
                  method: 'PUT',
                  body: thumbnailFile,
                  headers: {
                    'Content-Type': thumbnailFile.type,
                  },
                });
                thumbnailUrl = thumbR2Data.publicUrl;
              }
            }
          }
        } catch (uploadError: any) {
          clearTimeout(timeoutWarning);
          console.error('R2 upload error:', uploadError);
          if (uploadError.message?.includes('timeout') || uploadError.message?.includes('network')) {
            setVideoStatus('Error: Upload timed out. Please check your internet connection and try again.');
          } else {
            setVideoStatus(`Error: R2 upload failed - ${uploadError.message || 'Unknown error'}`);
          }
          return;
        }
      } else {
        // Fallback to Vercel Blob if R2 is not configured
        const r2Error = await r2Res.json();
        if (r2Error.setupRequired) {
          setVideoStatus('R2 not configured, falling back to Vercel Blob...');
        }

        // Use Vercel Blob as fallback
        const tokenRes = await fetch('/api/videos/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: videoFile.name,
            contentType: videoFile.type,
          }),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
          setVideoStatus(`Error: ${tokenData.error || 'Failed to get upload token'}`);
          return;
        }

        const { put } = await import('@vercel/blob');
        const timestamp = Date.now();
        const sanitizedName = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const videoFileName = `videos/${timestamp}-${sanitizedName}`;

        setVideoStatus('Uploading video to Vercel Blob... (This may take 10-30 minutes for large files)');
        
        const timeoutWarning = setTimeout(() => {
          setVideoStatus('Uploading video to Vercel Blob... (Large file - this is normal, please wait)');
        }, 120000);

        let videoBlob;
        try {
          videoBlob = await put(videoFileName, videoFile, {
            access: 'public',
            token: tokenData.token,
          });
          clearTimeout(timeoutWarning);
          videoUrl = videoBlob.url;

          // Upload thumbnail if provided
          if (thumbnailFile && thumbnailFile.size > 0) {
            setVideoStatus('Uploading thumbnail...');
            const thumbnailFileName = `videos/thumbnails/${timestamp}-${sanitizedName.replace(/\.[^/.]+$/, '')}.jpg`;
            const thumbnailBlob = await put(thumbnailFileName, thumbnailFile, {
              access: 'public',
              token: tokenData.token,
            });
            thumbnailUrl = thumbnailBlob.url;
          }
        } catch (uploadError: any) {
          clearTimeout(timeoutWarning);
          console.error('Video upload error:', uploadError);
          if (uploadError.message?.includes('timeout') || uploadError.message?.includes('network')) {
            setVideoStatus('Error: Upload timed out. Please check your internet connection and try again.');
          } else {
            setVideoStatus(`Error: Upload failed - ${uploadError.message || 'Unknown error'}`);
          }
          return;
        }
      }

      setUploadedVideoUrl(videoUrl);
      setUploadedThumbnailUrl(thumbnailUrl);

      // Step 4: Add video to The Vault
      setVideoStatus('Adding video to database...');
      const addRes = await fetch('/api/videos/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoTitle,
          description: videoDescription,
          videoUrl: videoUrl,
          videoType: 'exclusive',
          category: videoCategory,
          thumbnailUrl: thumbnailUrl || '',
          date: videoDate || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          duration: videoDuration || '',
          isExclusive: true,
        }),
      });

      // Check if response is JSON before parsing
      const addContentType = addRes.headers.get('content-type');
      let addData;
      
      if (addContentType && addContentType.includes('application/json')) {
        addData = await addRes.json();
      } else {
        // If not JSON, get text response
        const textResponse = await addRes.text();
        console.error('Non-JSON response from add API:', textResponse);
        setVideoStatus(`Error: Video uploaded but failed to add to vault - ${textResponse.substring(0, 100)}`);
        return;
      }

      if (!addRes.ok) {
        console.error('Failed to add video to vault:', addData);
        setVideoStatus(`Error: Video uploaded but failed to add to vault: ${addData.error || 'Unknown error'}`);
        return;
      }

      console.log('Video successfully added to vault:', addData);
      setVideoStatus('✅ Video uploaded and added to The Vault successfully!');
      
      // Reset form
      setVideoFile(null);
      setThumbnailFile(null);
      setVideoTitle('');
      setVideoDescription('');
      setVideoCategory('educational');
      setVideoDate('');
      setVideoDuration('');
      setUploadedVideoUrl('');
      setUploadedThumbnailUrl('');

      // Clear file inputs
      const videoInput = document.getElementById('video-input') as HTMLInputElement;
      const thumbnailInput = document.getElementById('thumbnail-input') as HTMLInputElement;
      if (videoInput) videoInput.value = '';
      if (thumbnailInput) thumbnailInput.value = '';
    } catch (error: any) {
      console.error('Video upload error:', error);
      setVideoStatus(`Error: ${error.message || 'Failed to upload video'}`);
    } finally {
      setVideoUploading(false);
    }
  };

  const handleDeleteAllNotifications = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setDeleteStatus('Click again to confirm deletion');
      setTimeout(() => {
        setConfirmDelete(false);
        setDeleteStatus('');
      }, 4000);
      return;
    }
    setDeleting(true);
    setDeleteStatus('');
    setConfirmDelete(false);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeleteStatus(data.message);
      } else {
        setDeleteStatus(`Error: ${data.error}`);
      }
    } catch {
      setDeleteStatus('Failed to delete notifications.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">Admin Dashboard</h1>
            </Link>
            <p className="text-zinc-500 mt-2 text-sm">Enter your NOTIFY_SECRET to access</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Admin secret key"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            />
            <button
              onClick={handleLogin}
              disabled={loading || !secret}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Checking...' : 'Access Dashboard'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-zinc-400 mt-1">Manage subscribers and send notifications</p>
          </div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            ← Back to site
          </Link>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Subscribers</p>
            <p className="text-3xl font-bold text-blue-400 mt-1">{totalUsers}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Database</p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSetupDb}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                Run Setup
              </button>
              {dbStatus && <span className="text-xs text-zinc-400">{dbStatus}</span>}
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</p>
            <button
              onClick={refreshUsers}
              disabled={loading}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 underline transition-colors mt-2"
            >
              {loading ? 'Refreshing...' : 'Refresh Users'}
            </button>
          </div>
        </div>

        {/* New Report / Article Notification */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">📢 New Report Notification</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Creates a bell notification for all users and optionally sends an email blast.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="Report title (e.g. Weekly Market Outlook — 02/09/2026)"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              value={notifyDesc}
              onChange={(e) => setNotifyDesc(e.target.value)}
              placeholder="Short description (shown in bell dropdown & email)"
              rows={3}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <input
              type="text"
              value={notifyLink}
              onChange={(e) => setNotifyLink(e.target.value)}
              placeholder="Link (optional — e.g. /research or a PDF URL)"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
              />
              Also send email to all {totalUsers} subscriber{totalUsers !== 1 ? 's' : ''}
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={handleNotify}
                disabled={notifySending || !notifyTitle.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
              >
                {notifySending ? 'Sending...' : 'Publish Notification'}
              </button>
              {notifyStatus && (
                <span className={`text-sm ${notifyStatus.startsWith('Error') || notifyStatus.startsWith('Bell created, but') ? 'text-yellow-400' : 'text-green-400'}`}>
                  {notifyStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bell-Only Notification */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">🔔 Bell-Only Notification</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Creates a notification that appears in the bell dropdown only (no email). Good for site updates, new features, etc.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={bellTitle}
              onChange={(e) => setBellTitle(e.target.value)}
              placeholder="Title (e.g. New feature: Video section is live!)"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <textarea
              value={bellDesc}
              onChange={(e) => setBellDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <input
              type="text"
              value={bellLink}
              onChange={(e) => setBellLink(e.target.value)}
              placeholder="Link (optional — e.g. /videos)"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex items-center gap-3">
              <select
                value={bellType}
                onChange={(e) => setBellType(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="update">🟢 Update</option>
                <option value="article">🔵 Article</option>
                <option value="alert">⚪ General</option>
              </select>
              <button
                onClick={handleBellOnly}
                disabled={bellSending || !bellTitle.trim()}
                className="px-6 py-2.5 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-700/50 text-white font-semibold rounded-lg transition-colors"
              >
                {bellSending ? 'Creating...' : 'Create Bell Notification'}
              </button>
              {bellStatus && (
                <span className={`text-sm ${bellStatus.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
                  {bellStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delete All Notifications */}
        <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">🗑️ Delete All Notifications</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Permanently removes all bell notifications from the database. New users won&apos;t see any old notifications.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDeleteAllNotifications}
              disabled={deleting}
              className={`px-6 py-2.5 font-semibold rounded-lg transition-colors ${
                confirmDelete
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-zinc-700 hover:bg-red-600 text-zinc-300 hover:text-white'
              } disabled:opacity-50`}
            >
              {deleting ? 'Deleting...' : confirmDelete ? 'Confirm Delete All' : 'Delete All Notifications'}
            </button>
            {deleteStatus && (
              <span className={`text-sm ${deleteStatus.startsWith('Error') || deleteStatus.startsWith('Failed') ? 'text-red-400' : deleteStatus.startsWith('Click') ? 'text-yellow-400' : 'text-green-400'}`}>
                {deleteStatus}
              </span>
            )}
          </div>
        </div>

        {/* Video Upload to The Vault */}
        <div className="bg-zinc-900 border border-blue-500/20 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-1">🎬 Upload Video to The Vault</h2>
          <p className="text-sm text-zinc-400 mb-4">
            Upload exclusive videos to The Vault. Videos are stored on Vercel Blob and automatically added to the videos page.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Video File <span className="text-red-400">*</span>
                </label>
                <input
                  id="video-input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {videoFile && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Thumbnail (Optional)
                </label>
                <input
                  id="thumbnail-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-zinc-700 file:text-white hover:file:bg-zinc-600"
                />
                {thumbnailFile && (
                  <p className="text-xs text-zinc-500 mt-1">{thumbnailFile.name}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="Video title"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="Video description"
                rows={4}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Category
                </label>
                <select
                  value={videoCategory}
                  onChange={(e) => setVideoCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="market-analysis">Market Analysis</option>
                  <option value="trading-strategies">Trading Strategies</option>
                  <option value="educational">Educational</option>
                  <option value="live-trading">Live Trading</option>
                  <option value="market-structure">Market Structure</option>
                  <option value="risk-management">Risk Management</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Date (Optional)
                </label>
                <input
                  type="text"
                  value={videoDate}
                  onChange={(e) => setVideoDate(e.target.value)}
                  placeholder="e.g. Jan 2025"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Duration (Optional)
                </label>
                <input
                  type="text"
                  value={videoDuration}
                  onChange={(e) => setVideoDuration(e.target.value)}
                  placeholder="e.g. 15:30"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-50 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={handleVideoUpload}
                disabled={videoUploading || !videoFile || !videoTitle.trim() || !videoDescription.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-semibold rounded-lg transition-colors"
              >
                {videoUploading ? 'Uploading...' : 'Upload to The Vault'}
              </button>
              {videoStatus && (
                <span className={`text-sm ${
                  videoStatus.startsWith('Error') || videoStatus.startsWith('❌')
                    ? 'text-red-400'
                    : videoStatus.startsWith('✅')
                    ? 'text-green-400'
                    : 'text-yellow-400'
                }`}>
                  {videoStatus}
                </span>
              )}
            </div>

            {uploadedVideoUrl && (
              <div className="mt-4 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <p className="text-xs text-zinc-400 mb-1">Video URL:</p>
                <p className="text-xs text-zinc-500 break-all">{uploadedVideoUrl}</p>
              </div>
            )}
          </div>
        </div>

        {/* User Feedback */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold">💬 User Feedback</h2>
            <div className="flex items-center gap-3">
              {feedbackLoaded && feedbackList.length > 0 && (
                <button
                  onClick={handleDeleteAllFeedback}
                  className="text-xs font-medium text-zinc-400 hover:text-red-400 transition-colors"
                >
                  Delete All
                </button>
              )}
              <button
                onClick={fetchFeedback}
                disabled={feedbackLoading}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                {feedbackLoading ? 'Loading...' : feedbackLoaded ? 'Refresh' : 'Load Feedback'}
              </button>
            </div>
          </div>
          {!feedbackLoaded ? (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">
              Click &quot;Load Feedback&quot; to view user submissions.
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">
              No feedback submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {feedbackList.map((item) => (
                <div key={item.id} className="px-6 py-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-zinc-200">{item.username || 'Unknown'}</span>
                    <span className="text-xs text-zinc-500">{item.user_email}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      item.category === 'feature'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : item.category === 'bug'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}>
                      {item.category}
                    </span>
                    <span className="text-xs text-zinc-600 ml-auto">
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Management */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold">🎬 Manage Videos</h2>
            <button
              onClick={fetchVideos}
              disabled={videosLoading}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              {videosLoading ? 'Loading...' : videosLoaded ? 'Refresh' : 'Load Videos'}
            </button>
          </div>
          {!videosLoaded ? (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">
              Click &quot;Load Videos&quot; to view uploaded videos.
            </div>
          ) : videosList.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">
              No videos uploaded yet.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {videosList.map((video) => (
                <div key={video.id} className="px-6 py-4 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-zinc-200 mb-1 truncate">{video.title}</h3>
                      <p className="text-xs text-zinc-500 truncate">{video.videoUrl}</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {new Date(video.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                        deleteVideoId === video.id
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-zinc-700 hover:bg-red-600 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {deleteVideoId === video.id ? 'Confirm Delete' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {deleteVideoStatus && (
            <div className={`px-6 py-3 border-t border-zinc-800 ${
              deleteVideoStatus.startsWith('Error') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
            }`}>
              <p className="text-sm">{deleteVideoStatus}</p>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold">Registered Users</h2>
          </div>
          {users.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500">
              No users have signed up yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="text-left px-6 py-3 font-medium">#</th>
                    <th className="text-left px-6 py-3 font-medium">Name</th>
                    <th className="text-left px-6 py-3 font-medium">Email</th>
                    <th className="text-left px-6 py-3 font-medium">Username</th>
                    <th className="text-left px-6 py-3 font-medium">Signed Up</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr key={user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3 text-zinc-500">{i + 1}</td>
                      <td className="px-6 py-3 font-medium">{user.name}</td>
                      <td className="px-6 py-3 text-blue-400">{user.email}</td>
                      <td className="px-6 py-3 text-zinc-300">{user.username}</td>
                      <td className="px-6 py-3 text-zinc-500">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


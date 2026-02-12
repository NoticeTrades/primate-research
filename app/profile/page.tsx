'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '../components/Navigation';
import CursorGlow from '../components/CursorGlow';
import CursorHover from '../components/CursorHover';
import DiscordSign from '../components/DiscordSign';
import ScrollFade from '../components/ScrollFade';
import MarketTicker from '../components/MarketTicker';
import VideoCard from '../components/VideoCard';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  username: string;
  profilePictureUrl?: string | null;
  profile_picture_url?: string | null; // Support both naming conventions
  bio: string | null;
  createdAt: string;
  userRole?: string;
}

interface SavedVideo {
  videoId: number;
  videoType: string;
  savedAt: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  date: string | null;
  duration: string | null;
  viewCount: number;
  isExclusive: boolean;
}

interface UserComment {
  id: number;
  videoId: number;
  videoType: string;
  commentText: string;
  parentId: number | null;
  createdAt: string;
  videoTitle: string | null;
  videoThumbnail: string | null;
}

type Tab = 'saved' | 'comments' | 'settings';

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('saved');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
  const [userComments, setUserComments] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [uploadingPicture, setUploadingPicture] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      loadSavedVideos();
      loadUserComments();
    }
  }, [isAuthenticated, activeTab]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (!data.authenticated) {
        router.push('/login?redirect=/profile');
      }
    } catch (error) {
      router.push('/login?redirect=/profile');
    }
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        console.log('Profile loaded:', {
          username: data.user?.username,
          hasProfilePicture: !!data.user?.profilePictureUrl,
          profilePictureLength: data.user?.profilePictureUrl?.length || 0,
        });
        // Ensure profilePictureUrl is set (handle both snake_case and camelCase)
        const userData = {
          ...data.user,
          profilePictureUrl: data.user.profilePictureUrl || data.user.profile_picture_url || null,
          userRole: data.user.userRole || data.user.user_role || 'premium',
        };
        console.log('Profile loaded:', {
          username: userData.username,
          hasProfilePicture: !!userData.profilePictureUrl,
          profilePictureLength: userData.profilePictureUrl?.length || 0,
          userRole: userData.userRole,
        });
        setProfile(userData);
        setBioText(userData.bio || '');
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load profile:', errorData);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedVideos = async () => {
    try {
      const res = await fetch('/api/videos/saved');
      if (res.ok) {
        const data = await res.json();
        setSavedVideos(data.savedVideos || []);
      }
    } catch (error) {
      console.error('Failed to load saved videos:', error);
    }
  };

  const loadUserComments = async () => {
    try {
      const res = await fetch('/api/user/comments');
      if (res.ok) {
        const data = await res.json();
        setUserComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to load user comments:', error);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingPicture(true);

    try {
      // Convert to base64 for now (in production, upload to R2/Blob)
      const reader = new FileReader();
      reader.onerror = () => {
        console.error('FileReader error');
        alert('Failed to read image file');
        setUploadingPicture(false);
      };
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        if (!base64String || typeof base64String !== 'string') {
          console.error('Invalid base64 string');
          alert('Failed to process image');
          setUploadingPicture(false);
          return;
        }
        
        console.log('Uploading profile picture, base64 length:', base64String.length);
        
        try {
          console.log('Sending profile picture upload request...');
          const res = await fetch('/api/user/profile-picture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: base64String }),
          });

          console.log('Upload response status:', res.status);
          
          const responseData = await res.json().catch(async (e) => {
            const text = await res.text().catch(() => '');
            console.error('Failed to parse JSON response:', text);
            return { error: 'Invalid response from server', raw: text };
          });
          
          console.log('Upload response data:', responseData);
          
          if (res.ok && responseData.success) {
            const newPictureUrl = responseData.profilePictureUrl;
            console.log('Profile picture uploaded successfully:', newPictureUrl?.substring(0, 50));
            // Update profile state immediately with the new picture
            setProfile(prev => {
              if (!prev) return null;
              const updated = { ...prev, profilePictureUrl: newPictureUrl };
              console.log('Updated profile state:', { 
                hasPicture: !!updated.profilePictureUrl,
                pictureLength: updated.profilePictureUrl?.length || 0 
              });
              return updated;
            });
            // Force a small delay then reload to ensure state is updated
            setTimeout(async () => {
              await loadProfile();
            }, 100);
            alert('Profile picture updated!');
          } else {
            console.error('Upload failed:', res.status, responseData);
            const errorMsg = responseData.error || responseData.details || 'Unknown error';
            alert(`Failed to upload profile picture: ${errorMsg}`);
          }
        } catch (error: any) {
          console.error('Upload error:', error);
          console.error('Error stack:', error.stack);
          alert(`Failed to upload profile picture: ${error.message || 'Network error'}. Please check console for details.`);
        } finally {
          setUploadingPicture(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File read error:', error);
      setUploadingPicture(false);
      alert('Failed to read image file');
    }
  };

  const handleBioSave = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: bioText }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(prev => prev ? { ...prev, bio: data.user.bio } : null);
        setEditingBio(false);
        alert('Bio updated!');
      } else {
        alert('Failed to update bio');
      }
    } catch (error) {
      console.error('Update bio error:', error);
      alert('Failed to update bio');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900">
      <Navigation />
      <div className="fixed top-[72px] left-0 right-0 z-40">
        <MarketTicker />
      </div>
      <CursorGlow />
      <CursorHover />
      <DiscordSign />
      <ScrollFade />

      <div className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Profile Header */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
                {(profile.profilePictureUrl || profile.profile_picture_url) ? (
                  <img
                    src={profile.profilePictureUrl || profile.profile_picture_url || ''}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Profile picture failed to load');
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('Profile picture loaded successfully');
                    }}
                  />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  className="hidden"
                  disabled={uploadingPicture}
                />
              </label>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-black dark:text-white">{profile.username}</h1>
                {profile.username === 'noticetrades' || profile.userRole === 'owner' ? (
                  <span className="px-3 py-1 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-full">
                    Owner / Founder
                  </span>
                ) : (
                  <span className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full">
                    PREMIUM
                  </span>
                )}
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">{profile.email}</p>
              
              {/* Bio */}
              {editingBio ? (
                <div className="mb-4">
                  <textarea
                    value={bioText}
                    onChange={(e) => setBioText(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleBioSave}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setBioText(profile.bio || '');
                        setEditingBio(false);
                      }}
                      className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-black dark:text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  {profile.bio ? (
                    <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{profile.bio}</p>
                  ) : (
                    <p className="text-zinc-500 dark:text-zinc-500 italic">No bio yet. Click edit to add one.</p>
                  )}
                  <button
                    onClick={() => setEditingBio(true)}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {profile.bio ? 'Edit bio' : 'Add bio'}
                  </button>
                </div>
              )}

              <p className="text-sm text-zinc-500 dark:text-zinc-500">
                Member since {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg mb-6 relative z-10">
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex">
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'saved'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Saved Videos ({savedVideos.length})
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'comments'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                My Comments ({userComments.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'settings'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Settings
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'saved' && (
              <div>
                {savedVideos.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 dark:text-zinc-400 mb-2">No saved videos yet</p>
                    <a href="/videos" className="text-blue-600 dark:text-blue-400 hover:underline">
                      Browse videos
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {savedVideos.map((video) => (
                      <VideoCard
                        key={video.videoId}
                        title={video.title}
                        description={video.description}
                        videoUrl={video.videoUrl}
                        videoType={video.videoType as 'youtube' | 'exclusive' | 'external'}
                        thumbnailUrl={video.thumbnailUrl || undefined}
                        date={video.date || undefined}
                        duration={video.duration || undefined}
                        viewCount={video.viewCount}
                        isExclusive={video.isExclusive}
                        videoDbId={video.videoId}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                {userComments.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 dark:text-zinc-400">No comments yet</p>
                  </div>
                ) : (
                  userComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {comment.videoThumbnail && (
                          <img
                            src={comment.videoThumbnail}
                            alt={comment.videoTitle || 'Video'}
                            className="w-24 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <a
                            href={`/videos?videoId=${comment.videoId}&openComments=true`}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium mb-1 block"
                          >
                            {comment.videoTitle || 'Video'}
                          </a>
                          <p className="text-zinc-700 dark:text-zinc-300 mb-2 whitespace-pre-wrap">
                            {comment.commentText}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-500">
                            {formatDate(comment.createdAt)}
                            {comment.parentId && ' · Reply'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-black dark:text-white mb-4">Account Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        disabled
                        className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Email cannot be changed</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={profile.username}
                        disabled
                        className="w-full px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">Username cannot be changed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';

interface Comment {
  id: number;
  userEmail: string;
  username: string;
  commentText: string;
  parentId: number | null;
  createdAt: string;
  isOwnComment: boolean;
  replies: Comment[];
}

interface VideoCommentsProps {
  videoId: number;
  videoType?: 'youtube' | 'exclusive' | 'external';
  onClose?: () => void;
  onCommentAdded?: () => void;
}

export default function VideoComments({ videoId, videoType = 'exclusive', onClose, onCommentAdded }: VideoCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    checkAuth();
    loadComments();
  }, [videoId, videoType]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        // Get username from cookie (client-side)
        const cookies = document.cookie.split(';');
        const usernameCookie = cookies.find(c => c.trim().startsWith('user_username='));
        if (usernameCookie) {
          setUsername(usernameCookie.split('=')[1]);
        }
      }
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments?videoType=${videoType}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent, parentId: number | null = null) => {
    e.preventDefault();
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText: text.trim(),
          parentId,
          videoType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (parentId) {
          // Add reply to the parent comment
          setComments(prev =>
            prev.map(comment =>
              comment.id === parentId
                ? { ...comment, replies: [...comment.replies, data.comment] }
                : comment
            )
          );
          setReplyText('');
          setReplyingTo(null);
        } else {
          // Add new top-level comment
          setComments([data.comment, ...comments]);
          setCommentText('');
          // Notify parent component to refresh comment count
          if (onCommentAdded) {
            onCommentAdded();
          }
        }
      } else if (res.status === 401) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/videos/${videoId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove comment from state
        setComments(prev => {
          // Remove top-level comment
          const filtered = prev.filter(c => c.id !== commentId);
          // Remove reply from parent
          return filtered.map(comment => ({
            ...comment,
            replies: comment.replies.filter(r => r.id !== commentId),
          }));
        });
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString();
    } else if (days > 0) {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (minutes > 0) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {onClose && (
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black dark:text-white">Comments</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Comment form */}
      {isAuthenticated ? (
        <form onSubmit={(e) => handleSubmitComment(e)} className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-zinc-500 mt-1">
                {commentText.length}/2000 characters
              </p>
            </div>
            <button
              type="submit"
              disabled={!commentText.trim() || isSubmitting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-2">Sign in to join the discussion</p>
          <a
            href="/login"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Sign in
          </a>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-zinc-200 dark:border-zinc-800 pb-6 last:border-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                  {comment.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-black dark:text-white">{comment.username}</span>
                    <span className="text-xs text-zinc-500">{formatDate(comment.createdAt)}</span>
                    {comment.isOwnComment && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="ml-auto text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words mb-2">
                    {comment.commentText}
                  </p>
                  {isAuthenticated && (
                    <button
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                    </button>
                  )}

                  {/* Reply form */}
                  {replyingTo === comment.id && (
                    <form
                      onSubmit={(e) => handleSubmitComment(e, comment.id)}
                      className="mt-3 flex gap-2"
                    >
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Reply to ${comment.username}...`}
                        rows={2}
                        maxLength={2000}
                        className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim() || isSubmitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
                      >
                        Reply
                      </button>
                    </form>
                  )}

                  {/* Replies */}
                  {comment.replies.length > 0 && (
                    <div className="mt-4 ml-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700 space-y-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/70 flex items-center justify-center text-white text-sm font-semibold">
                            {reply.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-black dark:text-white">{reply.username}</span>
                              <span className="text-xs text-zinc-500">{formatDate(reply.createdAt)}</span>
                              {reply.isOwnComment && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="ml-auto text-xs text-red-600 dark:text-red-400 hover:underline"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
                              {reply.commentText}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


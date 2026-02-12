'use client';

import { useState, useEffect, useRef, useCallback, useMemo, ReactElement } from 'react';

interface Comment {
  id: number;
  userEmail: string;
  username: string;
  commentText: string;
  parentId: number | null;
  createdAt: string;
  isOwnComment: boolean;
  profilePictureUrl?: string | null;
  userRole?: string;
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
  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set());
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

  const loadComments = useCallback(async () => {
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
  }, [videoId, videoType]);

  // Sanitize comment text for security
  const sanitizeText = useCallback((text: string): string => {
    // Remove potential XSS attempts while preserving legitimate content
    return text
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .slice(0, 2000); // Enforce max length
  }, []);

  const handleSubmitComment = useCallback(async (e: React.FormEvent, parentId: number | null = null) => {
    e.preventDefault();
    if (!isAuthenticated) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    const text = parentId ? replyText : commentText;
    const sanitized = sanitizeText(text);
    if (!sanitized) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText: sanitized,
          parentId,
          videoType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (parentId) {
          // Add reply to the parent (could be nested)
          const addReplyToComment = (comments: Comment[], parentId: number, newReply: Comment): Comment[] => {
            return comments.map(comment => {
              if (comment.id === parentId) {
                return { ...comment, replies: [...comment.replies, newReply] };
              }
              if (comment.replies.length > 0) {
                return { ...comment, replies: addReplyToComment(comment.replies, parentId, newReply) };
              }
              return comment;
            });
          };
          setComments(prev => addReplyToComment(prev, parentId, data.comment));
          setReplyText('');
          setReplyingTo(null);
        } else {
          // Add new top-level comment
          setComments(prev => [data.comment, ...prev]);
          setCommentText('');
          // Notify parent component to refresh comment count
          if (onCommentAdded) {
            onCommentAdded();
          }
        }
        // Reload comments to get fresh data with profile pictures
        await loadComments();
      } else if (res.status === 401) {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isAuthenticated, replyText, commentText, videoId, videoType, sanitizeText, onCommentAdded, loadComments]);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/videos/${videoId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Remove comment from state (recursively)
        const removeCommentRecursive = (comments: Comment[], id: number): Comment[] => {
          return comments
            .filter(c => c.id !== id)
            .map(comment => ({
              ...comment,
              replies: removeCommentRecursive(comment.replies, id),
            }));
        };
        setComments(prev => removeCommentRecursive(prev, commentId));
      }
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  }, [videoId]);

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

  const getUserBadge = (userRole?: string, username?: string) => {
    // Founder badge for noticetrades
    if (username === 'noticetrades' || userRole === 'owner') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-full">
          Founder
        </span>
      );
    }
    // Premium badge for premium users
    if (userRole === 'premium' || !userRole) {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-full">
          PREMIUM
        </span>
      );
    }
    return null;
  };

  // Recursive component for rendering nested comment threads
  const CommentThread = ({
    comment,
    depth,
    replyingTo,
    setReplyingTo,
    replyText,
    setReplyText,
    handleSubmitComment,
    handleDeleteComment,
    isAuthenticated,
    isSubmitting,
    collapsedThreads,
    setCollapsedThreads,
    getUserBadge,
    formatDate,
  }: {
    comment: Comment;
    depth: number;
    replyingTo: number | null;
    setReplyingTo: (id: number | null) => void;
    replyText: string;
    setReplyText: (text: string) => void;
    handleSubmitComment: (e: React.FormEvent, parentId: number | null) => Promise<void>;
    handleDeleteComment: (id: number) => Promise<void>;
    isAuthenticated: boolean;
    isSubmitting: boolean;
    collapsedThreads: Set<number>;
    setCollapsedThreads: (set: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
    getUserBadge: (userRole?: string, username?: string) => ReactElement | null;
    formatDate: (dateString: string) => string;
  }) => {
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
    const wasReplyingRef = useRef(false);
    const isCollapsed = collapsedThreads.has(comment.id);
    const replyCount = comment.replies.length;
    const maxDepth = 5; // Maximum nesting depth before collapsing
    const shouldCollapse = depth >= maxDepth || replyCount > 10; // Collapse if too deep or too many replies

    // Focus the textarea when reply form first opens (not on every render)
    const isReplying = replyingTo === comment.id;
    useEffect(() => {
      if (isReplying && !wasReplyingRef.current && replyTextareaRef.current) {
        // Use requestAnimationFrame for smoother focus
        requestAnimationFrame(() => {
          const textarea = replyTextareaRef.current;
          if (textarea) {
            textarea.focus();
            // Set cursor to end of text only on initial focus
            const length = textarea.value.length;
            if (length > 0) {
              textarea.setSelectionRange(length, length);
            }
          }
        });
      }
      wasReplyingRef.current = isReplying;
    }, [isReplying]);

    const toggleCollapse = () => {
      setCollapsedThreads(prev => {
        const next = new Set(prev);
        if (next.has(comment.id)) {
          next.delete(comment.id);
        } else {
          next.add(comment.id);
        }
        return next;
      });
    };

    const avatarSize = depth > 0 ? 'w-8 h-8' : 'w-10 h-10';
    const textSize = depth > 0 ? 'text-sm' : 'text-base';
    const indentClass = depth > 0 ? 'ml-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700' : '';

    return (
      <div className={`${indentClass} ${depth === 0 ? 'border-b border-zinc-200 dark:border-zinc-800 pb-6 last:border-0' : ''}`}>
        <div className="flex items-start gap-3">
          <div className={`${avatarSize} rounded-full bg-gradient-to-br ${depth > 0 ? 'from-blue-500/70 to-purple-600/70' : 'from-blue-500 to-purple-600'} flex items-center justify-center text-white ${depth > 0 ? 'text-sm' : ''} font-semibold overflow-hidden shrink-0`}>
            {comment.profilePictureUrl ? (
              <img
                src={comment.profilePictureUrl}
                alt={comment.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{comment.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`font-semibold ${textSize} text-black dark:text-white`}>{comment.username}</span>
              {getUserBadge(comment.userRole, comment.username)}
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
            <p className={`${textSize} text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words mb-2`}>
              {comment.commentText}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {isAuthenticated && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                </button>
              )}
              {replyCount > 0 && (
                <button
                  onClick={toggleCollapse}
                  className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {isCollapsed ? `Show ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : `Hide ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                </button>
              )}
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <form
                onSubmit={(e) => handleSubmitComment(e, comment.id)}
                className="mt-3 flex gap-2"
              >
                <textarea
                  ref={replyTextareaRef}
                  value={replyText}
                  onChange={(e) => {
                    // Don't stop propagation - let React handle it naturally
                    const newValue = e.target.value;
                    // Only update if within limit
                    if (newValue.length <= 2000) {
                      setReplyText(newValue);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Prevent form submission on Enter (only Ctrl/Cmd+Enter submits)
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmitComment(e, comment.id);
                    }
                  }}
                  placeholder={`Reply to ${comment.username}...`}
                  rows={2}
                  maxLength={2000}
                  autoComplete="off"
                  spellCheck="true"
                  className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
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

            {/* Nested Replies */}
            {comment.replies.length > 0 && !isCollapsed && (
              <div className="mt-4 space-y-4">
                {comment.replies.map((reply) => (
                  <CommentThread
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                    replyingTo={replyingTo}
                    setReplyingTo={setReplyingTo}
                    replyText={replyText}
                    setReplyText={setReplyText}
                    handleSubmitComment={handleSubmitComment}
                    handleDeleteComment={handleDeleteComment}
                    isAuthenticated={isAuthenticated}
                    isSubmitting={isSubmitting}
                    collapsedThreads={collapsedThreads}
                    setCollapsedThreads={setCollapsedThreads}
                    getUserBadge={getUserBadge}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">

      {/* Comment form */}
      {isAuthenticated ? (
        <form onSubmit={(e) => handleSubmitComment(e)} className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Only update if within limit
                  if (newValue.length <= 2000) {
                    setCommentText(newValue);
                  }
                }}
                onKeyDown={(e) => {
                  // Prevent form submission on Enter (only Ctrl/Cmd+Enter submits)
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmitComment(e);
                  }
                }}
                placeholder="Add a comment..."
                rows={3}
                maxLength={2000}
                autoComplete="off"
                spellCheck="true"
                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-black dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-colors"
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
            <CommentThread
              key={comment.id}
              comment={comment}
              depth={0}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyText={replyText}
              setReplyText={setReplyText}
              handleSubmitComment={handleSubmitComment}
              handleDeleteComment={handleDeleteComment}
              isAuthenticated={isAuthenticated}
              isSubmitting={isSubmitting}
              collapsedThreads={collapsedThreads}
              setCollapsedThreads={setCollapsedThreads}
              getUserBadge={getUserBadge}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}


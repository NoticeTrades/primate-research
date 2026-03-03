'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import { usePathname } from 'next/navigation';

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

interface ResearchCommentsProps {
  articleSlug: string;
}

export default function ResearchComments({ articleSlug }: ResearchCommentsProps) {
  const pathname = usePathname();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    checkAuth();
    loadComments();
  }, [articleSlug]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
      if (data.authenticated) {
        const cookies = document.cookie.split(';');
        const usernameCookie = cookies.find((c) => c.trim().startsWith('user_username='));
        if (usernameCookie) {
          const currentUsername = usernameCookie.split('=')[1];
          setIsModerator(currentUsername === 'noticetrades');
        }
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/research/${articleSlug}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  }, [articleSlug]);

  const sanitizeText = (text: string) =>
    text
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .slice(0, 2000);

  const handleSubmitComment = useCallback(
    async (e: React.FormEvent, parentId: number | null = null) => {
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
        const res = await fetch(`/api/research/${articleSlug}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentText: sanitized, parentId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (parentId) {
            const addReply = (list: Comment[], pid: number, newReply: Comment): Comment[] =>
              list.map((c) =>
                c.id === pid ? { ...c, replies: [...c.replies, newReply] } : { ...c, replies: addReply(c.replies, pid, newReply) }
              );
            setComments((prev) => addReply(prev, parentId, data.comment));
            setReplyText('');
            setReplyingTo(null);
          } else {
            setComments((prev) => [data.comment, ...prev]);
            setCommentText('');
          }
          await loadComments();
        } else if (res.status === 401) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
      } catch (error) {
        console.error('Failed to submit comment:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isAuthenticated, commentText, replyText, articleSlug, loadComments]
  );

  const handleDeleteComment = useCallback(
    async (commentId: number) => {
      if (!confirm('Delete this comment?')) return;
      try {
        const res = await fetch(`/api/research/${articleSlug}/comments/${commentId}`, { method: 'DELETE' });
        if (res.ok) {
          const remove = (list: Comment[], id: number): Comment[] =>
            list.filter((c) => c.id !== id).map((c) => ({ ...c, replies: remove(c.replies, id) }));
          setComments((prev) => remove(prev, commentId));
        }
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    },
    [articleSlug]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 7) return date.toLocaleDateString();
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getUserBadge = (userRole?: string, username?: string): ReactElement | null => {
    if (username === 'noticetrades' || userRole === 'owner') {
      return (
        <span className="px-2 py-0.5 text-[10px] font-bold text-yellow-400 bg-yellow-900/30 border border-yellow-700 rounded-full">
          Founder
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold text-blue-400 bg-blue-900/30 border border-blue-800 rounded-full">
        PREMIUM
      </span>
    );
  };

  const CommentThread = ({
    comment,
    depth,
  }: {
    comment: Comment;
    depth: number;
  }) => {
    const isReplying = replyingTo === comment.id;
    const avatarSize = depth > 0 ? 'w-8 h-8' : 'w-10 h-10';
    const textSize = depth > 0 ? 'text-sm' : 'text-base';
    const indentClass = depth > 0 ? 'ml-4 pl-4 border-l-2 border-zinc-700' : '';

    return (
      <div className={`${indentClass} ${depth === 0 ? 'border-b border-zinc-800 pb-6 last:border-0' : ''}`}>
        <div className="flex items-start gap-3">
          <div
            className={`${avatarSize} rounded-full bg-zinc-700 flex items-center justify-center text-zinc-200 font-semibold overflow-hidden shrink-0`}
          >
            {comment.profilePictureUrl ? (
              <img src={comment.profilePictureUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{comment.username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`font-semibold ${textSize} text-zinc-100`}>{comment.username}</span>
              {getUserBadge(comment.userRole, comment.username)}
              <span className="text-xs text-zinc-500">{formatDate(comment.createdAt)}</span>
              {(comment.isOwnComment || isModerator) && (
                <button
                  type="button"
                  onClick={() => handleDeleteComment(comment.id)}
                  className="ml-auto text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              )}
            </div>
            <p className={`text-zinc-300 whitespace-pre-wrap break-words ${textSize}`}>{comment.commentText}</p>
            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                {isReplying ? 'Cancel' : 'Reply'}
              </button>
            )}
            {isReplying && (
              <form onSubmit={(e) => handleSubmitComment(e, comment.id)} className="mt-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={2000}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSubmitting}
                  className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Reply
                </button>
              </form>
            )}
            {comment.replies.length > 0 && (
              <div className="mt-4 space-y-0">
                {comment.replies.map((r) => (
                  <CommentThread key={r.id} comment={r} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading comments...</p>;
  }

  return (
    <div className="space-y-6">
      {isAuthenticated ? (
        <form onSubmit={(e) => handleSubmitComment(e, null)} className="flex flex-col gap-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!commentText.trim() || isSubmitting}
            className="self-start px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Posting...' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">
          <a href={`/login?redirect=${encodeURIComponent(pathname || '')}`} className="text-blue-400 hover:underline">
            Log in
          </a>{' '}
          to join the discussion.
        </p>
      )}

      <div className="space-y-0">
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">No comments yet. Be the first to share your thoughts.</p>
        ) : (
          comments.map((c) => <CommentThread key={c.id} comment={c} depth={0} />)
        )}
      </div>
    </div>
  );
}

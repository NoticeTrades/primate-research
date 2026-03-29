'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export type ChartFeedItem = {
  id: number;
  symbol: string;
  chart_url: string;
  title: string | null;
  chart_date: string;
  notes: string | null;
  created_at: string;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  userLiked: boolean;
  userSaved: boolean;
};

type CommentRow = {
  id: number;
  username: string;
  commentText: string;
  createdAt: string;
  isOwnComment: boolean;
  profilePictureUrl: string | null;
  userRole: string;
};

function formatChartDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

function formatCommentTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function ChartFeedCard({ chart }: { chart: ChartFeedItem }) {
  const [likeCount, setLikeCount] = useState(chart.likeCount);
  const [saveCount, setSaveCount] = useState(chart.saveCount);
  const [commentCount, setCommentCount] = useState(chart.commentCount);
  const [userLiked, setUserLiked] = useState(chart.userLiked);
  const [userSaved, setUserSaved] = useState(chart.userSaved);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentPosting, setCommentPosting] = useState(false);
  const [actionHint, setActionHint] = useState('');

  useEffect(() => {
    setLikeCount(chart.likeCount);
    setSaveCount(chart.saveCount);
    setCommentCount(chart.commentCount);
    setUserLiked(chart.userLiked);
    setUserSaved(chart.userSaved);
  }, [chart]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/index-charts/${chart.id}/comments`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setComments(data.comments || []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [chart.id]);


  const toggleLike = async () => {
    setLikeBusy(true);
    setActionHint('');
    try {
      const res = await fetch(`/api/index-charts/${chart.id}/like`, { method: 'POST' });
      const data = await res.json();
      if (res.status === 401) {
        setActionHint('Sign in to like posts.');
        return;
      }
      if (!res.ok) {
        setActionHint(data.error || 'Could not update like');
        return;
      }
      setLikeCount(data.likeCount);
      setUserLiked(data.userLiked);
    } catch {
      setActionHint('Network error');
    } finally {
      setLikeBusy(false);
    }
  };

  const toggleSave = async () => {
    setSaveBusy(true);
    setActionHint('');
    try {
      const res = await fetch(`/api/index-charts/${chart.id}/save`, { method: 'POST' });
      const data = await res.json();
      if (res.status === 401) {
        setActionHint('Sign in to save posts.');
        return;
      }
      if (!res.ok) {
        setActionHint(data.error || 'Could not update save');
        return;
      }
      setSaveCount(data.saveCount);
      setUserSaved(data.userSaved);
    } catch {
      setActionHint('Network error');
    } finally {
      setSaveBusy(false);
    }
  };

  const submitComment = async () => {
    const text = commentDraft.trim();
    if (!text) return;
    setCommentPosting(true);
    setActionHint('');
    try {
      const res = await fetch(`/api/index-charts/${chart.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentText: text }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setActionHint('Sign in to comment.');
        return;
      }
      if (!res.ok) {
        setActionHint(data.error || 'Could not post');
        return;
      }
      setCommentDraft('');
      setComments((prev) => [...prev, data.comment]);
      setCommentCount((c) => c + 1);
    } catch {
      setActionHint('Network error');
    } finally {
      setCommentPosting(false);
    }
  };

  return (
    <article className="rounded-2xl border border-zinc-700/80 overflow-hidden bg-zinc-900/80 shadow-xl shadow-black/25">
      <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center gap-2 justify-between bg-zinc-950/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 rounded-lg bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 font-mono text-xs font-bold text-blue-300">
            {chart.symbol}
          </span>
          <h2 className="font-semibold text-zinc-100 truncate text-sm sm:text-base">
            {chart.title || `Chart — ${formatChartDate(chart.chart_date)}`}
          </h2>
        </div>
        <time className="text-xs text-zinc-500 shrink-0">{formatChartDate(chart.chart_date)}</time>
      </div>

      <div className="relative w-full min-h-[180px] bg-black">
        <Image
          src={chart.chart_url}
          alt={chart.title || 'Trading chart'}
          width={1200}
          height={700}
          className="w-full h-auto object-contain max-h-[min(70vh,520px)]"
          unoptimized
        />
      </div>

      {chart.notes?.trim() ? (
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/35">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Analysis</p>
          <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{chart.notes}</div>
        </div>
      ) : (
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-950/20">
          <p className="text-xs text-zinc-600 italic">No caption from the desk on this one.</p>
        </div>
      )}

      <div className="px-3 py-2 border-t border-zinc-800 flex flex-wrap items-center gap-1 sm:gap-2 bg-zinc-950/50">
        <button
          type="button"
          onClick={toggleLike}
          disabled={likeBusy}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            userLiked
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <span aria-hidden>{userLiked ? '♥' : '♡'}</span>
          <span>{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setCommentsOpen((v) => {
              const next = !v;
              if (next) void loadComments();
              return next;
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition border border-transparent"
        >
          <span aria-hidden>💬</span>
          <span>{commentCount}</span>
        </button>
        <button
          type="button"
          onClick={toggleSave}
          disabled={saveBusy}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
            userSaved
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/35'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent'
          }`}
        >
          <span aria-hidden>{userSaved ? '★' : '☆'}</span>
          <span>Save</span>
          {saveCount > 0 && <span className="text-zinc-500 tabular-nums">({saveCount})</span>}
        </button>
        <Link
          href={`/indices/${chart.symbol}`}
          className="ml-auto text-xs text-blue-400 hover:text-blue-300 font-medium"
        >
          Index page →
        </Link>
      </div>

      {actionHint && (
        <div className="px-4 py-2 border-t border-zinc-800 bg-amber-950/20 text-xs text-amber-200/90 flex flex-wrap items-center gap-2">
          <span>{actionHint}</span>
          <Link href="/login" className="underline font-semibold text-amber-100">
            Log in
          </Link>
        </div>
      )}

      {commentsOpen && (
        <div className="border-t border-zinc-800 bg-zinc-950/60 px-4 py-3">
          <div className="mb-3">
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              maxLength={2000}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-y min-h-[3rem]"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={submitComment}
                disabled={commentPosting || !commentDraft.trim()}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
              >
                {commentPosting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>

          {commentsLoading ? (
            <p className="text-sm text-zinc-500 py-4">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-zinc-500 py-2">No comments yet. Start the thread.</p>
          ) : (
            <ul className="space-y-3 max-h-[min(50vh,360px)] overflow-y-auto pr-1">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center text-xs font-bold text-zinc-400">
                    {c.profilePictureUrl ? (
                      <img src={c.profilePictureUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      c.username.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <span className="font-semibold text-zinc-200">{c.username}</span>
                      <span className="text-[11px] text-zinc-500">{formatCommentTime(c.createdAt)}</span>
                    </div>
                    <p className="text-zinc-300 whitespace-pre-wrap break-words mt-0.5">{c.commentText}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

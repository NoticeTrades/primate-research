import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db';
import { researchArticles, generateSlug } from '../../../data/research';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Parse a date string like "Feb 16, 2026" or ISO to a timestamp for comparison. */
function parseDate(value: string | null | undefined): number {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

/** Format ISO date for display (e.g. "2026-02-16" -> "Feb 16, 2026"). */
function formatDisplayDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function GET() {
  try {
    const latestArticle = researchArticles[0] || null;
    const articleDate = latestArticle?.date ? parseDate(latestArticle.date) : 0;

    let latestVideo: { title: string; description: string; date: string | null; createdAt: string; id: number } | null = null;
    try {
      const sql = getDb();
      const rows = await sql`
        SELECT id, title, description, date, created_at as "createdAt"
        FROM videos
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (rows?.length) {
        const r = rows[0] as { id: number; title: string; description: string; date: string | null; createdAt: string };
        latestVideo = { id: r.id, title: r.title, description: r.description, date: r.date, createdAt: r.createdAt };
      }
    } catch {
      // no db or no videos
    }

    const videoDate = latestVideo ? parseDate(latestVideo.createdAt || latestVideo.date) : 0;

    // No content at all
    if (!latestArticle && !latestVideo) {
      return NextResponse.json({ type: null, title: null, description: null, date: null, link: null, badge: null, category: null, tags: null });
    }

    // Only report
    if (!latestVideo || articleDate >= videoDate) {
      const slug = latestArticle!.slug || generateSlug(latestArticle!.title);
      return NextResponse.json({
        type: 'report',
        title: latestArticle!.title,
        description: latestArticle!.description,
        date: latestArticle!.date || null,
        link: `/research/${slug}`,
        badge: 'Latest Report',
        category: latestArticle!.category,
        tags: latestArticle!.tags || [],
      });
    }

    // Only video, or video is newer
    return NextResponse.json({
      type: 'video',
      title: latestVideo.title,
      description: latestVideo.description,
      date: formatDisplayDate(latestVideo.date || latestVideo.createdAt) || latestVideo.date || latestVideo.createdAt?.slice(0, 10) || null,
      link: `/videos`,
      badge: 'Latest Video',
      category: null,
      tags: null,
      videoId: latestVideo.id,
    });
  } catch (error) {
    console.error('latest-content error:', error);
    return NextResponse.json(
      { type: null, title: null, description: null, date: null, link: null, badge: null, category: null, tags: null },
      { status: 200 }
    );
  }
}

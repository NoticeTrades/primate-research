import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function chartExists(sql: ReturnType<typeof getDb>, chartId: number): Promise<boolean> {
  const r = await sql`SELECT id FROM index_charts WHERE id = ${chartId} LIMIT 1`;
  return r.length > 0;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId: raw } = await params;
    const chartId = Number(raw);
    if (!Number.isInteger(chartId) || chartId < 1) {
      return NextResponse.json({ error: 'Invalid chart id' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    const sql = getDb();
    const rows = await sql`
      SELECT
        cc.id,
        cc.user_email,
        cc.username,
        cc.comment_text,
        cc.created_at,
        u.profile_picture_url,
        u.user_role
      FROM index_chart_comments cc
      LEFT JOIN users u ON u.email = cc.user_email
      WHERE cc.chart_id = ${chartId}
      ORDER BY cc.created_at ASC
    `;

    const comments = (rows as any[]).map((c) => ({
      id: c.id,
      userEmail: c.user_email,
      username: c.username,
      commentText: c.comment_text,
      createdAt: c.created_at,
      isOwnComment: userEmail === c.user_email,
      profilePictureUrl: c.profile_picture_url,
      userRole: c.user_role || 'premium',
    }));

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('chart comments GET:', error);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId: raw } = await params;
    const chartId = Number(raw);
    if (!Number.isInteger(chartId) || chartId < 1) {
      return NextResponse.json({ error: 'Invalid chart id' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    const username = cookieStore.get('user_username')?.value;

    if (!userEmail || !username) {
      return NextResponse.json({ error: 'Sign in to comment' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const commentText = String(body.commentText || body.comment_text || '')
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .slice(0, 2000);

    if (!commentText) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }

    const sql = getDb();
    if (!(await chartExists(sql, chartId))) {
      return NextResponse.json({ error: 'Chart not found' }, { status: 404 });
    }

    const ins = await sql`
      INSERT INTO index_chart_comments (chart_id, user_email, username, comment_text)
      VALUES (${chartId}, ${userEmail}, ${username}, ${commentText})
      RETURNING id, user_email, username, comment_text, created_at
    `;
    const row = ins[0] as any;

    const users = await sql`
      SELECT profile_picture_url, user_role FROM users WHERE email = ${userEmail}
    `;
    const u = users[0] as any;

    return NextResponse.json({
      comment: {
        id: row.id,
        userEmail: row.user_email,
        username: row.username,
        commentText: row.comment_text,
        createdAt: row.created_at,
        isOwnComment: true,
        profilePictureUrl: u?.profile_picture_url,
        userRole: u?.user_role || 'premium',
      },
    });
  } catch (error) {
    console.error('chart comments POST:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}

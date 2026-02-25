import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/research/[slug]/comments
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const sql = getDb();
    const allComments = await sql`
      SELECT 
        rc.id,
        rc.article_slug,
        rc.user_email,
        rc.username,
        rc.comment_text,
        rc.parent_id,
        rc.created_at,
        u.profile_picture_url,
        u.user_role
      FROM research_comments rc
      LEFT JOIN users u ON u.email = rc.user_email
      WHERE rc.article_slug = ${slug}
      ORDER BY rc.created_at ASC
    `;

    const commentMap = new Map<number, any>();
    const rootComments: any[] = [];

    (allComments as any[]).forEach((comment) => {
      const commentObj = {
        id: comment.id,
        userEmail: comment.user_email,
        username: comment.username,
        commentText: comment.comment_text,
        parentId: comment.parent_id,
        createdAt: comment.created_at,
        isOwnComment: userEmail === comment.user_email,
        profilePictureUrl: comment.profile_picture_url,
        userRole: comment.user_role || 'premium',
        replies: [] as any[],
      };
      commentMap.set(comment.id, commentObj);
    });

    (allComments as any[]).forEach((comment) => {
      const commentObj = commentMap.get(comment.id)!;
      if (comment.parent_id === null) {
        rootComments.push(commentObj);
      } else {
        const parent = commentMap.get(comment.parent_id);
        if (parent) parent.replies.push(commentObj);
        else rootComments.push(commentObj);
      }
    });

    return NextResponse.json({ comments: rootComments });
  } catch (error) {
    console.error('Error fetching research comments:', error);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

// POST /api/research/[slug]/comments
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    const username = cookieStore.get('user_username')?.value;

    if (!userEmail || !username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const body = await request.json();
    const commentText = (body.commentText || body.comment_text || '').trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .slice(0, 2000);
    if (!commentText) {
      return NextResponse.json({ error: 'Comment text required' }, { status: 400 });
    }

    const parentId = body.parentId ?? body.parent_id ?? null;
    const sql = getDb();

    const result = await sql`
      INSERT INTO research_comments (article_slug, user_email, username, comment_text, parent_id)
      VALUES (${slug}, ${userEmail}, ${username}, ${commentText}, ${parentId})
      RETURNING id, user_email, username, comment_text, parent_id, created_at
    `;
    const row = result[0] as any;
    const users = await sql`
      SELECT profile_picture_url, user_role FROM users WHERE email = ${userEmail}
    `;
    const comment = {
      id: row.id,
      userEmail: row.user_email,
      username: row.username,
      commentText: row.comment_text,
      parentId: row.parent_id,
      createdAt: row.created_at,
      isOwnComment: true,
      profilePictureUrl: users[0]?.profile_picture_url ?? null,
      userRole: users[0]?.user_role || 'premium',
      replies: [],
    };

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error posting research comment:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}

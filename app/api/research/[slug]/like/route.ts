import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/research/[slug]/like - Get like count and check if user liked it
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

    const likeCountResult = await sql`
      SELECT COUNT(*) as count
      FROM research_likes
      WHERE article_slug = ${slug}
    `;
    const likeCount = parseInt(String(likeCountResult[0]?.count ?? 0), 10);

    let userLiked = false;
    if (userEmail) {
      const userLikeResult = await sql`
        SELECT id
        FROM research_likes
        WHERE article_slug = ${slug} AND user_email = ${userEmail}
        LIMIT 1
      `;
      userLiked = userLikeResult.length > 0;
    }

    return NextResponse.json({ likeCount, userLiked });
  } catch (error: unknown) {
    console.error('Get research likes error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get likes' },
      { status: 500 }
    );
  }
}

// POST /api/research/[slug]/like - Toggle like
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    const sql = getDb();

    const existingLike = await sql`
      SELECT id
      FROM research_likes
      WHERE article_slug = ${slug} AND user_email = ${userEmail}
      LIMIT 1
    `;

    if (existingLike.length > 0) {
      await sql`
        DELETE FROM research_likes
        WHERE article_slug = ${slug} AND user_email = ${userEmail}
      `;
    } else {
      await sql`
        INSERT INTO research_likes (article_slug, user_email)
        VALUES (${slug}, ${userEmail})
        ON CONFLICT (article_slug, user_email) DO NOTHING
      `;
    }

    const likeCountResult = await sql`
      SELECT COUNT(*) as count
      FROM research_likes
      WHERE article_slug = ${slug}
    `;
    const likeCount = parseInt(String(likeCountResult[0]?.count ?? 0), 10);

    const userLikeResult = await sql`
      SELECT id
      FROM research_likes
      WHERE article_slug = ${slug} AND user_email = ${userEmail}
      LIMIT 1
    `;
    const userLiked = userLikeResult.length > 0;

    return NextResponse.json({ success: true, likeCount, userLiked });
  } catch (error: unknown) {
    console.error('Toggle research like error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle like' },
      { status: 500 }
    );
  }
}

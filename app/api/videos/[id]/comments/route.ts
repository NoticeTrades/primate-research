import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/videos/[id]/comments - Get all comments for a video
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (isNaN(videoId)) {
      return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
    }

    const sql = getDb();
    const url = new URL(request.url);
    const videoType = url.searchParams.get('videoType') || 'exclusive';

    // Get all top-level comments (no parent_id)
    const comments = await sql`
      SELECT 
        id,
        user_email,
        username,
        comment_text,
        parent_id,
        created_at
      FROM video_comments
      WHERE video_id = ${videoId} AND video_type = ${videoType} AND parent_id IS NULL
      ORDER BY created_at DESC
    `;

    // Get all replies for each comment
    const commentIds = comments.map((c: any) => c.id);
    let replies: any[] = [];
    if (commentIds.length > 0) {
      const repliesResult = await sql`
        SELECT 
          id,
          user_email,
          username,
          comment_text,
          parent_id,
          created_at
        FROM video_comments
        WHERE parent_id = ANY(${commentIds})
        ORDER BY created_at ASC
      `;
      replies = repliesResult;
    }

    // Group replies by parent_id
    const repliesByParent: Record<number, any[]> = {};
    replies.forEach((reply: any) => {
      if (!repliesByParent[reply.parent_id]) {
        repliesByParent[reply.parent_id] = [];
      }
      repliesByParent[reply.parent_id].push(reply);
    });

    // Attach replies to comments
    const commentsWithReplies = comments.map((comment: any) => ({
      id: comment.id,
      userEmail: comment.user_email,
      username: comment.username,
      commentText: comment.comment_text,
      parentId: comment.parent_id,
      createdAt: comment.created_at,
      isOwnComment: userEmail === comment.user_email,
      replies: repliesByParent[comment.id] || [],
    }));

    return NextResponse.json({
      comments: commentsWithReplies,
    });
  } catch (error: any) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get comments' },
      { status: 500 }
    );
  }
}

// POST /api/videos/[id]/comments - Add a comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const videoId = parseInt(id);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    const username = cookieStore.get('user_username')?.value;

    if (!userEmail || !username) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (isNaN(videoId)) {
      return NextResponse.json({ error: 'Invalid video ID' }, { status: 400 });
    }

    const body = await request.json();
    const { commentText, parentId, videoType = 'exclusive' } = body;

    if (!commentText || commentText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    if (commentText.length > 2000) {
      return NextResponse.json(
        { error: 'Comment is too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const sql = getDb();

      // If parentId is provided, verify it exists and belongs to the same video
      if (parentId) {
        const parentComment = await sql`
          SELECT id
          FROM video_comments
          WHERE id = ${parentId} AND video_id = ${videoId} AND video_type = ${videoType}
          LIMIT 1
        `;
        if (parentComment.length === 0) {
          return NextResponse.json(
            { error: 'Parent comment not found' },
            { status: 404 }
          );
        }
      }

      const result = await sql`
        INSERT INTO video_comments (user_email, username, video_id, video_type, comment_text, parent_id)
        VALUES (${userEmail}, ${username}, ${videoId}, ${videoType}, ${commentText.trim()}, ${parentId || null})
        RETURNING id, user_email, username, comment_text, parent_id, created_at
      `;

      // If this is a reply, send notification to the parent comment author
      if (parentId) {
        try {
          const parentComment = await sql`
            SELECT user_email, username, comment_text
            FROM video_comments
            WHERE id = ${parentId}
            LIMIT 1
          `;

          if (parentComment.length > 0 && parentComment[0].user_email !== userEmail) {
            // Get video title for notification
            const video = await sql`
              SELECT title
              FROM videos
              WHERE id = ${videoId}
              LIMIT 1
            `;
            const videoTitle = video.length > 0 ? video[0].title : 'a video';

            // Create notification for the parent comment author
            await sql`
              INSERT INTO notifications (title, description, link, type, user_email)
              VALUES (
                ${`${username} replied to your comment`},
                ${`"${commentText.trim().substring(0, 100)}${commentText.trim().length > 100 ? '...' : ''}" on ${videoTitle}`},
                ${`/videos?videoId=${videoId}&openComments=true`},
                ${'comment_reply'},
                ${parentComment[0].user_email}
              )
            `;
          }
        } catch (notifError) {
          console.error('Failed to send comment reply notification:', notifError);
          // Don't fail the comment creation if notification fails
        }
      }

      return NextResponse.json({
        success: true,
        comment: {
          id: result[0].id,
          userEmail: result[0].user_email,
          username: result[0].username,
          commentText: result[0].comment_text,
          parentId: result[0].parent_id,
          createdAt: result[0].created_at,
          isOwnComment: true,
          replies: [],
        },
      });
  } catch (error: any) {
    console.error('Add comment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add comment' },
      { status: 500 }
    );
  }
}


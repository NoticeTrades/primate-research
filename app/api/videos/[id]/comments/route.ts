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

    // Get ALL comments (both top-level and nested) with profile pictures and user roles
    const allComments = await sql`
      SELECT 
        vc.id,
        vc.user_email,
        vc.username,
        vc.comment_text,
        vc.parent_id,
        vc.created_at,
        u.profile_picture_url,
        u.user_role
      FROM video_comments vc
      LEFT JOIN users u ON vc.user_email = u.email
      WHERE vc.video_id = ${videoId} AND vc.video_type = ${videoType}
      ORDER BY vc.created_at ASC
    `;

    // Build a tree structure from flat list
    const commentMap = new Map<number, any>();
    const rootComments: any[] = [];

    // First pass: create comment objects
    allComments.forEach((comment: any) => {
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

    // Second pass: build tree structure
    allComments.forEach((comment: any) => {
      const commentObj = commentMap.get(comment.id)!;
      if (comment.parent_id === null) {
        // Top-level comment
        rootComments.push(commentObj);
      } else {
        // Nested reply - find parent and add to its replies
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentObj);
        } else {
          // Orphaned comment (parent deleted) - treat as top-level
          rootComments.push(commentObj);
        }
      }
    });

    // Sort root comments by newest first, replies by oldest first (conversation flow)
    rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Recursively sort replies
    const sortReplies = (replies: any[]) => {
      replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      replies.forEach(reply => {
        if (reply.replies.length > 0) {
          sortReplies(reply.replies);
        }
      });
    };
    rootComments.forEach(comment => {
      if (comment.replies.length > 0) {
        sortReplies(comment.replies);
      }
    });

    const commentsWithReplies = rootComments;

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

      // Get user's profile picture and role
      const userProfile = await sql`
        SELECT profile_picture_url, user_role
        FROM users
        WHERE email = ${userEmail}
        LIMIT 1
      `;
      const profilePictureUrl = userProfile.length > 0 ? userProfile[0].profile_picture_url : null;
      const userRole = userProfile.length > 0 ? (userProfile[0].user_role || 'premium') : 'premium';

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
          profilePictureUrl: profilePictureUrl,
          userRole: userRole,
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


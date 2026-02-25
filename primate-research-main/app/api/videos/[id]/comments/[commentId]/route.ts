import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../../lib/db';

export const dynamic = 'force-dynamic';

// DELETE /api/videos/[id]/comments/[commentId] - Delete a comment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const videoId = parseInt(id);
    const commentIdNum = parseInt(commentId);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (isNaN(videoId) || isNaN(commentIdNum)) {
      return NextResponse.json({ error: 'Invalid video or comment ID' }, { status: 400 });
    }

    const sql = getDb();

    // Get user info to check if they're a moderator
    const users = await sql`
      SELECT username, user_role
      FROM users
      WHERE email = ${userEmail}
      LIMIT 1
    `;

    const currentUser = users[0];
    const isModerator = currentUser?.username === 'noticetrades' || currentUser?.user_role === 'owner';

    // Verify the comment exists
    const comment = await sql`
      SELECT id, user_email
      FROM video_comments
      WHERE id = ${commentIdNum} AND video_id = ${videoId}
      LIMIT 1
    `;

    if (comment.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check permissions: moderators can delete any comment, users can only delete their own
    if (!isModerator && comment[0].user_email !== userEmail) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete the comment (CASCADE will delete replies automatically)
    await sql`
      DELETE FROM video_comments
      WHERE id = ${commentIdNum}
    `;

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete comment' },
      { status: 500 }
    );
  }
}


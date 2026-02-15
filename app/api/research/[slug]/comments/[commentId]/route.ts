import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../../../lib/db';

export const dynamic = 'force-dynamic';

// DELETE /api/research/[slug]/comments/[commentId]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    const { slug, commentId } = await params;
    const commentIdNum = parseInt(commentId, 10);
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isNaN(commentIdNum)) {
      return NextResponse.json({ error: 'Invalid comment ID' }, { status: 400 });
    }

    const sql = getDb();
    const existing = await sql`
      SELECT id, user_email FROM research_comments
      WHERE id = ${commentIdNum} AND article_slug = ${slug}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if ((existing[0] as any).user_email !== userEmail) {
      return NextResponse.json({ error: 'You can only delete your own comment' }, { status: 403 });
    }

    await sql`DELETE FROM research_comments WHERE id = ${commentIdNum}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting research comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

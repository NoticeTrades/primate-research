import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../../lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    const username = cookieStore.get('user_username')?.value;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const sql = getDb();
    const roomIdNum = parseInt(roomId, 10);

    if (isNaN(roomIdNum)) {
      return NextResponse.json(
        { error: 'Invalid room ID' },
        { status: 400 }
      );
    }

    // Verify room exists
    const roomsRaw = await sql`
      SELECT id, name, is_active FROM chat_rooms WHERE id = ${roomIdNum}
    `;
    const rooms = Array.isArray(roomsRaw) ? roomsRaw : (roomsRaw as { rows?: { is_active?: boolean }[] })?.rows ?? [];

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const room = rooms[0] as { id: number; name: string; is_active?: boolean };
    if (room.is_active === false) {
      return NextResponse.json(
        { error: 'Room is not active' },
        { status: 403 }
      );
    }

    // Get pagination params (for scalability - load messages in chunks)
    const url = new URL(request.url);
    const beforeId = url.searchParams.get('before_id');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 200); // Max 200 per request

    // Get messages (paginated for scalability)
    let rawMessages: unknown;
    if (beforeId) {
      rawMessages = await sql`
        SELECT 
          cm.id,
          cm.room_id,
          cm.user_email,
          cm.username,
          cm.message_text,
          cm.created_at,
          cm.reply_to_id,
          u.profile_picture_url,
          u.user_role,
          reply_to.username AS reply_to_username,
          LEFT(reply_to.message_text, 150) AS reply_to_text
        FROM chat_messages cm
        LEFT JOIN users u ON u.email = cm.user_email
        LEFT JOIN chat_messages reply_to ON reply_to.id = cm.reply_to_id
        WHERE cm.room_id = ${roomIdNum} AND cm.id < ${parseInt(beforeId, 10)}
        ORDER BY cm.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      rawMessages = await sql`
        SELECT 
          cm.id,
          cm.room_id,
          cm.user_email,
          cm.username,
          cm.message_text,
          cm.created_at,
          cm.reply_to_id,
          u.profile_picture_url,
          u.user_role,
          reply_to.username AS reply_to_username,
          LEFT(reply_to.message_text, 150) AS reply_to_text
        FROM chat_messages cm
        LEFT JOIN users u ON u.email = cm.user_email
        LEFT JOIN chat_messages reply_to ON reply_to.id = cm.reply_to_id
        WHERE cm.room_id = ${roomIdNum}
        ORDER BY cm.created_at DESC
        LIMIT ${limit}
      `;
    }
    const messages = Array.isArray(rawMessages) ? rawMessages : (rawMessages as { rows?: unknown[] })?.rows ?? [];

    // Get files and reactions by joining on room (avoids ANY(array) which can fail with Neon)
    const messageIds = messages.map((m: any) => m.id);
    const messageIdSet = new Set(messageIds);
    let filesMap: Record<number, any[]> = {};
    let reactionsMap: Record<number, { emoji: string; count: number; reacted: boolean }[]> = {};

    if (messageIds.length > 0) {
      try {
        const files = await sql`
          SELECT cmf.message_id, cmf.id, cmf.file_url, cmf.file_name, cmf.file_type, cmf.file_size
          FROM chat_message_files cmf
          INNER JOIN chat_messages cm ON cm.id = cmf.message_id AND cm.room_id = ${roomIdNum}
          ORDER BY cmf.created_at ASC
        `;
        (files as { message_id: number; id: number; file_url: string; file_name: string; file_type: string; file_size?: number }[]).forEach((file) => {
          if (!messageIdSet.has(file.message_id)) return;
          if (!filesMap[file.message_id]) filesMap[file.message_id] = [];
          filesMap[file.message_id].push({
            id: file.id,
            file_url: file.file_url,
            file_name: file.file_name,
            file_type: file.file_type,
            file_size: file.file_size,
          });
        });
      } catch (e) {
        console.error('Error fetching chat message files:', e);
      }
      try {
        const reactions = await sql`
          SELECT cmr.message_id, cmr.emoji, cmr.user_email
          FROM chat_message_reactions cmr
          INNER JOIN chat_messages cm ON cm.id = cmr.message_id AND cm.room_id = ${roomIdNum}
        `;
        const countByMessageEmoji: Record<string, { count: number; reacted: boolean }> = {};
        (reactions as { message_id: number; emoji: string; user_email: string }[]).forEach((r) => {
          if (!messageIdSet.has(r.message_id)) return;
          const key = `${r.message_id}:${r.emoji}`;
          if (!countByMessageEmoji[key]) countByMessageEmoji[key] = { count: 0, reacted: false };
          countByMessageEmoji[key].count += 1;
          if (r.user_email === userEmail) countByMessageEmoji[key].reacted = true;
        });
        messageIds.forEach((mid: number) => {
          reactionsMap[mid] = Object.entries(countByMessageEmoji)
            .filter(([k]) => k.split(':')[0] === String(mid))
            .map(([k, v]) => ({ emoji: k.split(':')[1] ?? '', count: v.count, reacted: v.reacted }));
        });
      } catch (e) {
        console.error('Error fetching chat message reactions:', e);
      }
    }

    // Attach files and reactions to messages
    const messagesWithFiles = messages.map((m: any) => ({
      ...m,
      files: filesMap[m.id] || [],
      reactions: reactionsMap[m.id] || [],
    }));

    // Reverse to show oldest first (for display)
    const reversedMessages = messagesWithFiles.reverse();

    return NextResponse.json({ messages: reversedMessages });
  } catch (error: any) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;
    const username = cookieStore.get('user_username')?.value;

    if (!userEmail || !username) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let body: { message_text?: string; files?: unknown[]; reply_to_id?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    const { message_text, files, reply_to_id: replyToId } = body;

    // Message text is optional if files are provided
    if (!message_text && (!files || files.length === 0)) {
      return NextResponse.json(
        { error: 'Message text or files are required' },
        { status: 400 }
      );
    }

    // Sanitize message (prevent XSS) - allow empty if files are provided
    const sanitizedMessage = message_text
      ? message_text
          .trim()
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .slice(0, 2000) // Max 2000 characters
      : '';

    // Validate files array if provided
    type FileEntry = { file_url?: string; file_name?: string; file_type?: string; file_size?: number };
    if (files && Array.isArray(files)) {
      for (const file of files as FileEntry[]) {
        if (!file.file_url || !file.file_name || !file.file_type) {
          return NextResponse.json(
            { error: 'Invalid file data. file_url, file_name, and file_type are required.' },
            { status: 400 }
          );
        }
      }
    }

    const sql = getDb();
    const roomIdNum = parseInt(roomId, 10);

    if (isNaN(roomIdNum)) {
      return NextResponse.json(
        { error: 'Invalid room ID' },
        { status: 400 }
      );
    }

    // Verify room exists and is active
    const roomsRaw = await sql`
      SELECT id, name, is_active FROM chat_rooms WHERE id = ${roomIdNum}
    `;
    const rooms = Array.isArray(roomsRaw) ? roomsRaw : (roomsRaw as { rows?: { is_active?: boolean }[] })?.rows ?? [];

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const roomPost = rooms[0] as { id: number; name: string; is_active?: boolean };
    if (roomPost.is_active === false) {
      return NextResponse.json(
        { error: 'Room is not active' },
        { status: 403 }
      );
    }

    // Validate reply_to_id if provided (must exist and be in same room)
    let replyToIdNum: number | null = null;
    if (replyToId != null && replyToId !== '') {
      const id = parseInt(String(replyToId), 10);
      if (!Number.isNaN(id) && id > 0) {
        const existing = await sql`
          SELECT id FROM chat_messages WHERE id = ${id} AND room_id = ${roomIdNum}
        `;
        if (existing.length > 0) replyToIdNum = id;
      }
    }

    // Insert message (use empty string if no text but files exist)
    const messageText = sanitizedMessage || (files && files.length > 0 ? '' : '');
    const result = await sql`
      INSERT INTO chat_messages (room_id, user_email, username, message_text, reply_to_id)
      VALUES (${roomIdNum}, ${userEmail}, ${username}, ${messageText}, ${replyToIdNum})
      RETURNING id, room_id, user_email, username, message_text, created_at, reply_to_id
    `;
    type InsertRow = { id: number; room_id: number; user_email: string; username: string; message_text: string; created_at: string; reply_to_id: number | null };
    const row = (Array.isArray(result) ? result[0] : (result as unknown as { rows?: InsertRow[] })?.rows?.[0]) as InsertRow | undefined;
    if (!row || row.id == null) {
      console.error('Chat POST: INSERT RETURNING did not return a row', result);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }
    const messageId = row.id;

    // Insert file attachments if provided
    if (files && Array.isArray(files) && files.length > 0) {
      for (const file of files as FileEntry[]) {
        await sql`
          INSERT INTO chat_message_files (message_id, file_url, file_name, file_type, file_size)
          VALUES (${messageId}, ${file.file_url}, ${file.file_name}, ${file.file_type}, ${file.file_size ?? null})
        `;
      }
    }

    // Parse @mentions and create notifications (query one username at a time to avoid ANY(array) with Neon)
    if (sanitizedMessage) {
      const mentionRegex = /@(\w+)/g;
      const mentionedUsernames = new Set<string>();
      let match;
      while ((match = mentionRegex.exec(sanitizedMessage)) !== null) {
        mentionedUsernames.add(match[1].toLowerCase());
      }

      if (mentionedUsernames.size > 0) {
        const roomInfo = await sql`
          SELECT name FROM chat_rooms WHERE id = ${roomIdNum}
        `;
        const roomName = (roomInfo[0] as { name?: string } | undefined)?.name || 'Chat';
        const notifTitle = `${username} mentioned you in #${roomName}`;
        const notifDesc = sanitizedMessage.length > 100 ? sanitizedMessage.substring(0, 100) + '...' : sanitizedMessage;
        const notifLink = `/chat?room=${roomIdNum}`;

        for (const uname of mentionedUsernames) {
          const mentionedUsers = await sql`
            SELECT email, username FROM users
            WHERE LOWER(username) = ${uname} AND verified = true AND email != ${userEmail}
          `;
          for (const mentionedUser of mentionedUsers as { email: string; username: string }[]) {
            await sql`
              INSERT INTO notifications (title, description, link, type, user_email)
              VALUES (${notifTitle}, ${notifDesc}, ${notifLink}, 'chat_mention', ${mentionedUser.email})
            `;
          }
        }
      }
    }

    // Get user profile info and files for the response
    const users = await sql`
      SELECT profile_picture_url, user_role
      FROM users
      WHERE email = ${userEmail}
    `;

    const messageFiles = files && Array.isArray(files) && files.length > 0
      ? files.map((f: any) => ({
          id: 0, // Will be set by database
          file_url: f.file_url,
          file_name: f.file_name,
          file_type: f.file_type,
          file_size: f.file_size,
        }))
      : [];

    const msgRow = row as { id: number; room_id: number; user_email: string; username: string; message_text: string; created_at: string; reply_to_id: number | null };
    let reply_to_username: string | null = null;
    let reply_to_text: string | null = null;
    if (msgRow.reply_to_id) {
      const replyRow = await sql`
        SELECT username, LEFT(message_text, 150) AS reply_to_text
        FROM chat_messages WHERE id = ${msgRow.reply_to_id}
      `;
      if (replyRow.length > 0) {
        const r = replyRow[0] as { username: string; reply_to_text: string };
        reply_to_username = r.username;
        reply_to_text = r.reply_to_text;
      }
    }
    const message = {
      ...msgRow,
      profile_picture_url: users[0]?.profile_picture_url || null,
      user_role: users[0]?.user_role || 'premium',
      files: messageFiles,
      reply_to_username: reply_to_username ?? undefined,
      reply_to_text: reply_to_text ?? undefined,
    };

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error('Error posting chat message:', error);
    return NextResponse.json(
      { error: 'Failed to post message' },
      { status: 500 }
    );
  }
}


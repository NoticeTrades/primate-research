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
    const rooms = await sql`
      SELECT id, name, is_active FROM chat_rooms WHERE id = ${roomIdNum}
    `;

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    if (!rooms[0].is_active) {
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
    let messages;
    if (beforeId) {
      // Load older messages (pagination)
      messages = await sql`
        SELECT 
          cm.id,
          cm.room_id,
          cm.user_email,
          cm.username,
          cm.message_text,
          cm.created_at,
          u.profile_picture_url,
          u.user_role
        FROM chat_messages cm
        LEFT JOIN users u ON u.email = cm.user_email
        WHERE cm.room_id = ${roomIdNum} AND cm.id < ${parseInt(beforeId, 10)}
        ORDER BY cm.created_at DESC
        LIMIT ${limit}
      `;
    } else {
      // Load most recent messages
      messages = await sql`
        SELECT 
          cm.id,
          cm.room_id,
          cm.user_email,
          cm.username,
          cm.message_text,
          cm.created_at,
          u.profile_picture_url,
          u.user_role
        FROM chat_messages cm
        LEFT JOIN users u ON u.email = cm.user_email
        WHERE cm.room_id = ${roomIdNum}
        ORDER BY cm.created_at DESC
        LIMIT ${limit}
      `;
    }

    // Get files for all messages
    const messageIds = messages.map((m: any) => m.id);
    let filesMap: Record<number, any[]> = {};
    
    if (messageIds.length > 0) {
      const files = await sql`
        SELECT 
          message_id,
          id,
          file_url,
          file_name,
          file_type,
          file_size
        FROM chat_message_files
        WHERE message_id = ANY(${messageIds})
        ORDER BY created_at ASC
      `;
      
      files.forEach((file: any) => {
        if (!filesMap[file.message_id]) {
          filesMap[file.message_id] = [];
        }
        filesMap[file.message_id].push({
          id: file.id,
          file_url: file.file_url,
          file_name: file.file_name,
          file_type: file.file_type,
          file_size: file.file_size,
        });
      });
    }

    // Attach files to messages
    const messagesWithFiles = messages.map((m: any) => ({
      ...m,
      files: filesMap[m.id] || [],
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

    const { message_text, files } = await request.json();

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
    if (files && Array.isArray(files)) {
      for (const file of files) {
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
    const rooms = await sql`
      SELECT id, name, is_active FROM chat_rooms WHERE id = ${roomIdNum}
    `;

    if (rooms.length === 0) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    if (!rooms[0].is_active) {
      return NextResponse.json(
        { error: 'Room is not active' },
        { status: 403 }
      );
    }

    // Insert message (use empty string if no text but files exist)
    const messageText = sanitizedMessage || (files && files.length > 0 ? '' : '');
    const result = await sql`
      INSERT INTO chat_messages (room_id, user_email, username, message_text)
      VALUES (${roomIdNum}, ${userEmail}, ${username}, ${messageText})
      RETURNING id, room_id, user_email, username, message_text, created_at
    `;

    const messageId = result[0].id;

    // Insert file attachments if provided
    if (files && Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        await sql`
          INSERT INTO chat_message_files (message_id, file_url, file_name, file_type, file_size)
          VALUES (${messageId}, ${file.file_url}, ${file.file_name}, ${file.file_type}, ${file.file_size || null})
        `;
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

    const message = {
      ...result[0],
      profile_picture_url: users[0]?.profile_picture_url || null,
      user_role: users[0]?.user_role || 'premium',
      files: messageFiles,
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


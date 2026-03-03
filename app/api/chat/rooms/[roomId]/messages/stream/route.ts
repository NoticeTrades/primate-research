import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '../../../../../../../lib/db';

// Server-Sent Events endpoint for real-time message updates
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const cookieStore = await cookies();
    const userEmail = cookieStore.get('user_email')?.value;

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

    if (rooms.length === 0 || !rooms[0].is_active) {
      return NextResponse.json(
        { error: 'Room not found or inactive' },
        { status: 404 }
      );
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let lastMessageId = 0;
        let isActive = true;

        // Send initial connection message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
        );

        // Poll for new messages every 500ms for instant updates (like RocketChat)
        const interval = setInterval(async () => {
          if (!isActive) {
            clearInterval(interval);
            return;
          }

          try {
            const newMessages = await sql`
              SELECT 
                cm.id,
                cm.room_id,
                cm.user_email,
                cm.username,
                cm.message_text,
                cm.created_at,
                u.profile_picture_url,
                u.user_role,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', cmf.id,
                      'file_url', cmf.file_url,
                      'file_name', cmf.file_name,
                      'file_type', cmf.file_type,
                      'file_size', cmf.file_size
                    )
                  ) FILTER (WHERE cmf.id IS NOT NULL),
                  '[]'::json
                ) as files
              FROM chat_messages cm
              LEFT JOIN users u ON u.email = cm.user_email
              LEFT JOIN chat_message_files cmf ON cmf.message_id = cm.id
              WHERE cm.room_id = ${roomIdNum} AND cm.id > ${lastMessageId}
              GROUP BY cm.id, cm.room_id, cm.user_email, cm.username, cm.message_text, cm.created_at, u.profile_picture_url, u.user_role
              ORDER BY cm.created_at ASC
            `;

            if (newMessages.length > 0) {
              for (const message of newMessages) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'message', message })}\n\n`
                  )
                );
                lastMessageId = Math.max(lastMessageId, message.id);
              }
            }
          } catch (error) {
            console.error('Error polling messages:', error);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', error: 'Failed to fetch messages' })}\n\n`
              )
            );
          }
        }, 500); // Poll every 500ms for instant updates

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          isActive = false;
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error creating SSE stream:', error);
    return NextResponse.json(
      { error: 'Failed to create stream' },
      { status: 500 }
    );
  }
}


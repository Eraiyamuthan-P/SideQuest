import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { TaskStatus, ApplicationStatus, NotificationType } from '@prisma/client';
import { createNotification } from '@/lib/notification';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const resolvedParams = await params;
    const taskId = resolvedParams.taskId;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task existence and user access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isPoster = task.poster_id === sessionUser.id;
    const isDoer = task.applications.some(app => app.doerId === sessionUser.id);

    if (!isPoster && !isDoer) {
      return NextResponse.json({ error: 'You do not have access to this conversation.' }, { status: 403 });
    }

    // Update user active chat room session details
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        activeChatTaskId: taskId,
        lastChatActiveAt: new Date(),
      },
    });

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { task_id: taskId },
      include: {
        sender: {
          select: { username: true },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return NextResponse.json({
      success: true,
      taskTitle: task.title,
      taskStatus: task.status,
      isPoster,
      messages,
    });

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const resolvedParams = await params;
    const taskId = resolvedParams.taskId;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Forbidden. Suspended accounts have read-only access.' }, { status: 403 });
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const { content, attachment_url, attachment_type } = await req.json();

    if (!content && !attachment_url) {
      return NextResponse.json({ error: 'Message content or attachment is required.' }, { status: 400 });
    }

    // Verify task access and status
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isPoster = task.poster_id === sessionUser.id;
    const isDoer = task.applications.some(app => app.doerId === sessionUser.id);

    if (!isPoster && !isDoer) {
      return NextResponse.json({ error: 'You are not authorized to send messages in this chat.' }, { status: 403 });
    }

    // ENFORCE: Completed or Cancelled chats are read-only
    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
      return NextResponse.json({
        error: 'This SideQuest is completed or cancelled. The chat thread is now locked as read-only.'
      }, { status: 400 });
    }

    // Save message
    const message = await prisma.message.create({
      data: {
        task_id: taskId,
        sender_id: sessionUser.id,
        content: content || '',
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
      },
      include: {
        sender: {
          select: { username: true },
        },
      },
    });

    // Notify recipient if they do not have the chat actively open
    const recipientId = isPoster ? (task.applications[0]?.doerId || null) : task.poster_id;

    if (recipientId && recipientId !== sessionUser.id) {
      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { activeChatTaskId: true, lastChatActiveAt: true },
      });

      let isChatActive = false;
      if (recipient?.activeChatTaskId === taskId && recipient.lastChatActiveAt) {
        const diffMs = Date.now() - new Date(recipient.lastChatActiveAt).getTime();
        if (diffMs <= 15000) {
          isChatActive = true;
        }
      }

      if (!isChatActive) {
        await createNotification({
          userId: recipientId,
          type: NotificationType.CHAT,
          title: 'New Message',
          message: `@${sessionUser.username}: ${content ? (content.length > 50 ? content.substring(0, 50) + '...' : content) : 'Sent an attachment.'}`,
          link: `/chat?taskId=${taskId}`,
          actorId: sessionUser.id,
          taskId: taskId,
        });
      }
    }

    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

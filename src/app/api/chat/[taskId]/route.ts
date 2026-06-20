import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { TaskStatus, ApplicationStatus } from '@prisma/client';

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
          where: { status: ApplicationStatus.accepted },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isPoster = task.poster_id === sessionUser.id;
    const isDoer = task.applications.some(app => app.applicant_id === sessionUser.id);

    if (!isPoster && !isDoer) {
      return NextResponse.json({ error: 'You do not have access to this conversation.' }, { status: 403 });
    }

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
          where: { status: ApplicationStatus.accepted },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isPoster = task.poster_id === sessionUser.id;
    const isDoer = task.applications.some(app => app.applicant_id === sessionUser.id);

    if (!isPoster && !isDoer) {
      return NextResponse.json({ error: 'You are not authorized to send messages in this chat.' }, { status: 403 });
    }

    // ENFORCE: Completed or Cancelled chats are read-only
    if (task.status === TaskStatus.completed || task.status === TaskStatus.cancelled) {
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

    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

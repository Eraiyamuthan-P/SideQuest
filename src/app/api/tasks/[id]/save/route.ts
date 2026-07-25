import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (!sessionUser) {
      return NextResponse.json({ saved: false });
    }

    const saved = await prisma.savedTask.findUnique({
      where: {
        user_id_task_id: {
          user_id: sessionUser.id,
          task_id: taskId,
        },
      },
    });

    return NextResponse.json({ saved: !!saved });
  } catch (error) {
    console.error('Error checking saved task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Try to save
    const saved = await prisma.savedTask.upsert({
      where: {
        user_id_task_id: {
          user_id: sessionUser.id,
          task_id: taskId,
        },
      },
      update: {},
      create: {
        user_id: sessionUser.id,
        task_id: taskId,
      },
    });

    return NextResponse.json({ success: true, message: 'Quest saved to bookmarks.', saved });
  } catch (error) {
    console.error('Error saving task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const existing = await prisma.savedTask.findUnique({
      where: {
        user_id_task_id: {
          user_id: sessionUser.id,
          task_id: taskId,
        },
      },
    });

    if (existing) {
      await prisma.savedTask.delete({
        where: { id: existing.id },
      });
    }

    return NextResponse.json({ success: true, message: 'Quest removed from bookmarks.' });
  } catch (error) {
    console.error('Error unsaving task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

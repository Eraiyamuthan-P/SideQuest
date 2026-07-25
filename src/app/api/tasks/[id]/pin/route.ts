import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required.' }, { status: 400 });
    }

    const { isPinned } = await req.json();

    if (isPinned === undefined) {
      return NextResponse.json({ error: 'Missing isPinned parameter.' }, { status: 400 });
    }

    // Fetch the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (task.poster_id !== sessionUser.id) {
      return NextResponse.json({ error: 'Only the poster can pin this task.' }, { status: 403 });
    }

    if (isPinned) {
      // 1. Unpin any other pinned tasks by this user
      await prisma.task.updateMany({
        where: { poster_id: sessionUser.id, isPinned: true },
        data: { isPinned: false },
      });

      // 2. Pin this task
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: { isPinned: true },
      });

      return NextResponse.json({ success: true, message: 'Task pinned successfully.', task: updated });
    } else {
      // Unpin this task
      const updated = await prisma.task.update({
        where: { id: taskId },
        data: { isPinned: false },
      });

      return NextResponse.json({ success: true, message: 'Task unpinned successfully.', task: updated });
    }

  } catch (error) {
    console.error('Error modifying task pin status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const tasks = await prisma.task.findMany({
      include: {
        poster: {
          select: {
            username: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error('Admin task list query error:', error);
    return NextResponse.json({ error: 'Failed to retrieve tasks.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { taskId, action, reason } = await req.json();
    if (!taskId || !action) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    // Reason validation checks (10-500 chars) for quest overrides
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
      return NextResponse.json({ error: 'Administrative reason must be between 10 and 500 characters long.' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        poster: {
          select: { email: true }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Quest not found.' }, { status: 404 });
    }

    const previousStatus = task.status;
    let newStatus = previousStatus;

    if (action === 'FORCE_COMPLETE') {
      newStatus = 'COMPLETED';
    } else if (action === 'FORCE_CANCEL') {
      newStatus = 'CANCELLED';
    } else if (action === 'RESOLVE_DISPUTE') {
      newStatus = 'COMPLETED';
    } else if (action === 'REOPEN_QUEST') {
      newStatus = 'OPEN';
    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    // Update the task status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus as any }
    });

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // Record administrative audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        targetId: taskId,
        targetEmail: task.poster?.email || null,
        action: `QUEST_${action}`,
        reason: reason.trim(),
        metadata: { oldStatus: previousStatus, newStatus: newStatus },
        ipAddress: ipAddress,
      }
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error: any) {
    console.error('Admin override error:', error);
    return NextResponse.json({ error: 'Administrative command failed.' }, { status: 500 });
  }
}

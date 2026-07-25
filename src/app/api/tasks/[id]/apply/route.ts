import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import sendEmail from '@/lib/email';
import { TaskStatus, ApplicationStatus, NotificationType } from '@prisma/client';
import { createNotification } from '@/lib/notification';

export async function POST(
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

    if (sessionUser.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Forbidden. Suspended accounts have read-only access.' }, { status: 403 });
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required.' }, { status: 400 });
    }

    const { requestedAmount, isCounterBid } = await req.json();
    const parsedRequestedAmount = parseInt(requestedAmount, 10);

    if (isNaN(parsedRequestedAmount) || parsedRequestedAmount <= 0) {
      return NextResponse.json({ error: 'Requested amount must be a positive integer.' }, { status: 400 });
    }

    // Fetch task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        poster: { select: { username: true, email: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (task.poster_id === sessionUser.id) {
      return NextResponse.json({ error: 'You cannot apply for your own task.' }, { status: 400 });
    }

    if (task.status !== TaskStatus.OPEN) {
      return NextResponse.json({ error: 'This task is no longer open for applications.' }, { status: 400 });
    }

    // Check if already applied
    const existingApplication = await prisma.taskApplication.findUnique({
      where: {
        taskId_doerId: {
          taskId: taskId,
          doerId: sessionUser.id,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json({ error: 'You have already applied for this task.' }, { status: 400 });
    }

    // Create the application
    const application = await prisma.taskApplication.create({
      data: {
        taskId: taskId,
        doerId: sessionUser.id,
        status: ApplicationStatus.PENDING,
        requestedAmount: parsedRequestedAmount,
        isCounterBid: !!isCounterBid,
      },
    });

    // Create Notification
    await createNotification({
      userId: task.poster_id,
      type: NotificationType.BID,
      title: 'New Applicant',
      message: `@${sessionUser.username} applied for "${task.title}" requesting ${parsedRequestedAmount}.`,
      link: `/tasks/${taskId}`,
      actorId: sessionUser.id,
      taskId: taskId,
    });

    // Send notification email to Poster
    await sendEmail({
      to: task.poster.email,
      subject: `[SideQuest Application] New applicant for "${task.title}"`,
      text: `@${sessionUser.username} has applied for your task "${task.title}" requesting ₹${parsedRequestedAmount}${isCounterBid ? ' (Counter-bid)' : ''}. Please log in to accept or reject.`,
      html: `<p><strong>@${sessionUser.username}</strong> has applied for your task <strong>"${task.title}"</strong>.</p><p>Requested amount: <strong>₹${parsedRequestedAmount}</strong> ${isCounterBid ? '(Counter-bid)' : ''}.</p><p>Go to your dashboard to review this application.</p>`,
    });

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully!',
      application,
    });

  } catch (error) {
    console.error('Error applying for task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const { requestedAmount, isCounterBid } = await req.json();
    const parsedRequestedAmount = parseInt(requestedAmount, 10);

    if (isNaN(parsedRequestedAmount) || parsedRequestedAmount <= 0) {
      return NextResponse.json({ error: 'Requested amount must be a positive integer.' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (task.status !== TaskStatus.OPEN) {
      return NextResponse.json({ error: 'This task is no longer open for modification.' }, { status: 400 });
    }

    const existing = await prisma.taskApplication.findUnique({
      where: {
        taskId_doerId: {
          taskId: taskId,
          doerId: sessionUser.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    if (existing.status !== ApplicationStatus.PENDING) {
      return NextResponse.json({ error: 'Only pending applications can be modified.' }, { status: 400 });
    }

    const updated = await prisma.taskApplication.update({
      where: { id: existing.id },
      data: {
        requestedAmount: parsedRequestedAmount,
        isCounterBid: !!isCounterBid,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Bid modified successfully!',
      application: updated,
    });

  } catch (error) {
    console.error('Error modifying application:', error);
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
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required.' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    const existing = await prisma.taskApplication.findUnique({
      where: {
        taskId_doerId: {
          taskId: taskId,
          doerId: sessionUser.id,
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    }

    if (existing.status !== ApplicationStatus.PENDING) {
      return NextResponse.json({ error: 'Only pending applications can be withdrawn.' }, { status: 400 });
    }

    await prisma.taskApplication.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Application withdrawn successfully!',
    });

  } catch (error) {
    console.error('Error withdrawing application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

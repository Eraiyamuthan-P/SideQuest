import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import sendEmail from '@/lib/email';
import { TaskStatus, ApplicationStatus, NotificationType } from '@prisma/client';
import { createNotification } from '@/lib/notification';

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

    const { application_id, action } = await req.json();

    if (!application_id || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Application ID and a valid action (accept or reject) are required.' }, { status: 400 });
    }

    // Fetch task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        poster: { select: { id: true, username: true, email: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (task.poster_id !== sessionUser.id) {
      return NextResponse.json({ error: 'Only the task poster can manage applications.' }, { status: 403 });
    }

    if (task.status !== TaskStatus.OPEN && task.status !== TaskStatus.ASSIGNED) {
      return NextResponse.json({ error: 'This task is not open for selection.' }, { status: 400 });
    }

    // Fetch the target application
    const application = await prisma.taskApplication.findUnique({
      where: { id: application_id },
      include: {
        doer: { select: { id: true, username: true, email: true } },
      },
    });

    if (!application || application.taskId !== taskId) {
      return NextResponse.json({ error: 'Application not found for this task.' }, { status: 404 });
    }

    if (application.status !== ApplicationStatus.PENDING) {
      return NextResponse.json({ error: 'This application has already been processed.' }, { status: 400 });
    }

    // Action 1: Reject Application
    if (action === 'reject') {
      const updatedApp = await prisma.taskApplication.update({
        where: { id: application_id },
        data: { status: ApplicationStatus.REJECTED },
      });

      await createNotification({
        userId: application.doerId,
        type: NotificationType.REJECTION,
        title: 'Application Declined',
        message: `@${sessionUser.username} declined your application for "${task.title}".`,
        link: `/tasks/${taskId}`,
        actorId: sessionUser.id,
        taskId: taskId,
      });

      return NextResponse.json({ success: true, message: 'Application rejected.', application: updatedApp });
    }

    // Fetch other pending applications before updating them to REJECTED
    const otherPendingApps = await prisma.taskApplication.findMany({
      where: {
        taskId: taskId,
        id: { not: application_id },
        status: ApplicationStatus.PENDING,
      },
      select: { doerId: true },
    });

    const agreedAmount = application.requestedAmount;

    // Process acceptance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update application status to accepted
      const acceptedApp = await tx.taskApplication.update({
        where: { id: application_id },
        data: { status: ApplicationStatus.ACCEPTED },
      });

      // 2. Update task status and agreedAmount
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.ASSIGNED,
          agreedAmount: agreedAmount,
        },
      });

      // 3. Reject all other pending applications for this task
      await tx.taskApplication.updateMany({
        where: {
          taskId: taskId,
          id: { not: application_id },
          status: ApplicationStatus.PENDING,
        },
        data: { status: ApplicationStatus.REJECTED },
      });

      // 4. Create introductory chat message
      await tx.message.create({
        data: {
          task_id: taskId,
          sender_id: task.poster_id,
          content: `SideQuest Assigned! @${application.doer.username} has been assigned to this task. The agreed offline payment is Rs. ${agreedAmount}.`,
        },
      });

      return { acceptedApp, updatedTask };
    });

    // Send notifications
    // 1. Send app notifications
    await createNotification({
      userId: application.doerId,
      type: NotificationType.ASSIGNMENT,
      title: 'Application Accepted!',
      message: `@${sessionUser.username} accepted your application for "${task.title}".`,
      link: `/chat?taskId=${taskId}`,
      actorId: sessionUser.id,
      taskId: taskId,
    });

    for (const app of otherPendingApps) {
      await createNotification({
        userId: app.doerId,
        type: NotificationType.REJECTION,
        title: 'Application Declined',
        message: `@${sessionUser.username} declined your application for "${task.title}".`,
        link: `/tasks/${taskId}`,
        actorId: sessionUser.id,
        taskId: taskId,
      });
    }

    // 2. Send email to accepted doer
    await sendEmail({
      to: application.doer.email,
      subject: `[SideQuest Assigned] ${task.title}`,
      text: `Congratulations! @${task.poster.username} has accepted your application for "${task.title}". The final price is agreed at Rs. ${agreedAmount}. Check your inbox to coordinate!`,
      html: `<p>Congratulations! <strong>@${task.poster.username}</strong> has accepted your application for <strong>"${task.title}"</strong>.</p><p>The final payment is <strong>Rs. ${agreedAmount}</strong>.</p><p>Go to your chat inbox to coordinate details.</p>`,
    });

    // 3. Send email to poster
    await sendEmail({
      to: task.poster.email,
      subject: `[SideQuest Assignment Confirmation] ${task.title}`,
      text: `You have successfully assigned @${application.doer.username} to your task "${task.title}".`,
      html: `<p>You have successfully assigned <strong>@${application.doer.username}</strong> to your task <strong>"${task.title}"</strong>.</p>`,
    });

    return NextResponse.json({
      success: true,
      message: 'Application accepted! Task is now fully assigned.',
      application: result.acceptedApp,
      task: result.updatedTask,
    });

  } catch (error) {
    console.error('Error managing applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

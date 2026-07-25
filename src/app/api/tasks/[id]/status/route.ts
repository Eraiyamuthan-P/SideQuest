import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import sendEmail from '@/lib/email';
import { TaskStatus, ApplicationStatus, SupportTicketType, NotificationType } from '@prisma/client';
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

    const { status } = await req.json();

    if (!status || !['pending_payment', 'completed', 'cancelled', 'disputed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid or missing status target.' }, { status: 400 });
    }

    // Fetch task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
          include: {
            doer: { select: { id: true, username: true, email: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    const isPoster = task.poster_id === sessionUser.id;
    const acceptedApp = task.applications[0] || null;
    const isDoer = acceptedApp ? acceptedApp.doerId === sessionUser.id : false;

    if (!isPoster && !isDoer) {
      return NextResponse.json({ error: 'You are not authorized to modify this task status.' }, { status: 403 });
    }

    // --- CASE 1: MARK DONE (Triggered by Doer moving task to PENDING_PAYMENT) ---
    if (status === 'pending_payment') {
      if (!isDoer) {
        return NextResponse.json({ error: 'Only the assigned doer can mark a task as completed.' }, { status: 403 });
      }

      if (task.status !== TaskStatus.ASSIGNED) {
        return NextResponse.json({ error: 'Only assigned tasks can be marked completed.' }, { status: 400 });
      }

      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.PENDING_PAYMENT,
          pendingPaymentSince: new Date(),
        },
      });

      // Create Notification
      await createNotification({
        userId: task.poster_id,
        type: NotificationType.COMPLETION,
        title: 'Quest Completed',
        message: `@${sessionUser.username} marked "${task.title}" as completed. Please confirm payment.`,
        link: `/tasks/${taskId}`,
        actorId: sessionUser.id,
        taskId: taskId,
      });

      // Send email to poster
      await sendEmail({
        to: task.poster_id, // we'll fetch actual email if needed, but we can look up poster email
        subject: `[SideQuest Payment Action Required] "${task.title}" marked done`,
        text: `@${sessionUser.username} has marked your task "${task.title}" as done. Please make the offline payment of ₹${task.agreedAmount || task.offeredAmount} and confirm it on the platform.`,
        html: `<p><strong>@${sessionUser.username}</strong> has marked your task <strong>"${task.title}"</strong> as done.</p><p>Please pay the agreed offline amount of <strong>₹${task.agreedAmount || task.offeredAmount}</strong> and confirm payment on the platform.</p>`,
      });

      return NextResponse.json({
        success: true,
        message: 'Task marked as done. Waiting for poster payment confirmation.',
        task: updatedTask,
      });
    }

    // --- CASE 2: CONFIRM PAYMENT (Triggered by Poster moving task to COMPLETED) ---
    if (status === 'completed') {
      if (!isPoster) {
        return NextResponse.json({ error: 'Only the task poster can confirm offline payment.' }, { status: 403 });
      }

      if (task.status !== TaskStatus.PENDING_PAYMENT) {
        return NextResponse.json({ error: 'You can only confirm payment for tasks pending payment.' }, { status: 400 });
      }

      if (!acceptedApp) {
        return NextResponse.json({ error: 'No accepted doer found for this task.' }, { status: 400 });
      }

      const updatedTask = await prisma.$transaction(async (tx) => {
        // 1. Update task status to COMPLETED
        const updated = await tx.task.update({
          where: { id: taskId },
          data: { status: TaskStatus.COMPLETED },
        });

        // 2. Award credits (+10 doer, +5 poster)
        await tx.user.update({
          where: { id: acceptedApp.doerId },
          data: { credits: { increment: 10 } },
        });

        await tx.user.update({
          where: { id: task.poster_id },
          data: { credits: { increment: 5 } },
        });

        return updated;
      });

      // Create Notification
      await createNotification({
        userId: acceptedApp.doerId,
        type: NotificationType.COMPLETION,
        title: 'Payment Confirmed!',
        message: `@${sessionUser.username} confirmed offline payment for "${task.title}". You received +10 credits!`,
        link: `/tasks/${taskId}`,
        actorId: sessionUser.id,
        taskId: taskId,
      });

      // Send email to doer
      await sendEmail({
        to: acceptedApp.doer.email,
        subject: `[SideQuest Payment Confirmed] Payment received for "${task.title}"`,
        text: `@${sessionUser.username} has confirmed your offline payment of ₹${task.agreedAmount || task.offeredAmount} for "${task.title}". You have been awarded +10 credits!`,
        html: `<p><strong>@${sessionUser.username}</strong> has confirmed your offline payment of <strong>₹${task.agreedAmount || task.offeredAmount}</strong> for <strong>"${task.title}"</strong>.</p><p>You have been awarded <strong>+10 credits</strong>!</p>`,
      });

      return NextResponse.json({
        success: true,
        message: 'Offline payment confirmed and credits awarded successfully!',
        task: updatedTask,
      });
    }

    // --- CASE 3: DISPUTE (Triggered by Doer reporting non-payment after 48h OR either user declining cancellation) ---
    if (status === 'disputed') {
      // Subcase 3a: Declining cancellation request
      if (task.cancellationRequestedBy) {
        if (task.cancellationRequestedBy === sessionUser.id) {
          return NextResponse.json({ error: 'You cannot dispute your own cancellation request.' }, { status: 400 });
        }

        const updatedTask = await prisma.$transaction(async (tx) => {
          const updated = await tx.task.update({
            where: { id: taskId },
            data: {
              status: TaskStatus.DISPUTED,
              cancellationRequestedBy: null,
            },
          });

          await tx.supportTicket.create({
            data: {
              user_id: sessionUser.id,
              type: SupportTicketType.dispute,
              subject: `Cancellation Dispute: Task "${task.title}"`,
              message: `User @${sessionUser.username} declined the cancellation request made by @${task.cancellationRequestedBy === task.poster_id ? 'poster' : 'doer'} for task "${task.title}". Admin review required.`,
              status: 'open',
            },
          });

          return updated;
        });

        // Notify the other user (cancellation requester) that it was disputed
        if (task.cancellationRequestedBy) {
          await createNotification({
            userId: task.cancellationRequestedBy,
            type: NotificationType.SYSTEM,
            title: 'Cancellation Disputed',
            message: `@${sessionUser.username} declined your cancellation request. Task is disputed.`,
            link: `/tasks/${taskId}`,
            actorId: sessionUser.id,
            taskId: taskId,
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Cancellation request declined. Task is now disputed and under admin review.',
          task: updatedTask,
        });
      }

      // Subcase 3b: Standard 48h non-payment dispute
      if (!isDoer) {
        return NextResponse.json({ error: 'Only the assigned doer can report non-payment.' }, { status: 403 });
      }

      if (task.status !== TaskStatus.PENDING_PAYMENT) {
        return NextResponse.json({ error: 'Only tasks pending payment can be disputed.' }, { status: 400 });
      }

      if (!task.pendingPaymentSince) {
        return NextResponse.json({ error: 'No completion timestamp found.' }, { status: 400 });
      }

      const diffMs = Date.now() - new Date(task.pendingPaymentSince).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 48) {
        return NextResponse.json({ error: 'You must wait 48 hours after marking the task complete before filing a dispute.' }, { status: 400 });
      }

      // Update task status to DISPUTED and file a support ticket automatically
      const updatedTask = await prisma.$transaction(async (tx) => {
        const updated = await tx.task.update({
          where: { id: taskId },
          data: { status: TaskStatus.DISPUTED },
        });

        // Automatically create a support dispute ticket
        await tx.supportTicket.create({
          data: {
            user_id: sessionUser.id,
            type: SupportTicketType.dispute,
            subject: `Non-Payment: Task "${task.title}"`,
            message: `User @${sessionUser.username} reported non-payment by poster @${task.poster_id} for the completed task "${task.title}" (Agreed amount: ₹${task.agreedAmount || task.offeredAmount}).`,
            status: 'open',
          },
        });

        return updated;
      });

      // Notify the poster about non-payment report
      await createNotification({
        userId: task.poster_id,
        type: NotificationType.SYSTEM,
        title: 'Quest Disputed',
        message: `@${sessionUser.username} reported non-payment. Task is under admin review.`,
        link: `/tasks/${taskId}`,
        actorId: sessionUser.id,
        taskId: taskId,
      });

      return NextResponse.json({
        success: true,
        message: 'Non-payment reported. A dispute ticket has been opened for administration review.',
        task: updatedTask,
      });
    }

    // --- CASE 4: CANCELLATION ---
    if (status === 'cancelled') {
      // 1. Task is OPEN: Poster can cancel directly (moves to CANCELLED)
      if (task.status === TaskStatus.OPEN) {
        if (!isPoster) {
          return NextResponse.json({ error: 'Only the quest poster can cancel an open task.' }, { status: 403 });
        }
        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: { status: TaskStatus.CANCELLED },
        });
        return NextResponse.json({
          success: true,
          message: 'Task cancelled successfully.',
          task: updatedTask,
        });
      }

      // 2. Task is ASSIGNED or PENDING_PAYMENT
      if (task.status !== TaskStatus.ASSIGNED && task.status !== TaskStatus.PENDING_PAYMENT) {
        return NextResponse.json({ error: 'Only open, assigned, or pending payment tasks can be cancelled.' }, { status: 400 });
      }

      if (!acceptedApp) {
        return NextResponse.json({ error: 'No assigned doer found for this task.' }, { status: 400 });
      }

      // If no cancellation request has been initiated, set current user as requester
      if (!task.cancellationRequestedBy) {
        const updatedTask = await prisma.task.update({
          where: { id: taskId },
          data: { cancellationRequestedBy: sessionUser.id },
        });

        // Notify the counter-party
        const counterPartyId = isPoster ? acceptedApp.doerId : task.poster_id;
        await createNotification({
          userId: counterPartyId,
          type: NotificationType.SYSTEM,
          title: 'Cancellation Requested',
          message: `@${sessionUser.username} requested cancellation for your task "${task.title}".`,
          link: `/tasks/${taskId}`,
          actorId: sessionUser.id,
          taskId: taskId,
        });

        return NextResponse.json({
          success: true,
          message: 'Cancellation request submitted. Waiting for other user to accept.',
          task: updatedTask,
        });
      }

      // If a cancellation request is active
      if (task.cancellationRequestedBy === sessionUser.id) {
        return NextResponse.json({ error: 'You have already requested cancellation. Waiting for response.' }, { status: 400 });
      }

      // The other user accepts the cancellation (Consensus reached)
      const updatedTask = await prisma.$transaction(async (tx) => {
        const requesterId = task.cancellationRequestedBy;
        const isRequesterPoster = requesterId === task.poster_id;

        // If poster requested and doer accepts -> task status becomes CANCELLED
        // If doer requested and poster accepts -> task status resets to OPEN (recycles the task)
        const targetStatus = isRequesterPoster ? TaskStatus.CANCELLED : TaskStatus.OPEN;

        const updated = await tx.task.update({
          where: { id: taskId },
          data: {
            status: targetStatus,
            agreedAmount: targetStatus === TaskStatus.OPEN ? null : task.agreedAmount,
            cancellationRequestedBy: null,
          },
        });

        // Reject the doer's application
        await tx.taskApplication.update({
          where: { id: acceptedApp.id },
          data: { status: ApplicationStatus.REJECTED },
        });

        return updated;
      });

      // Notify the requester that consensus was reached
      if (task.cancellationRequestedBy) {
        await createNotification({
          userId: task.cancellationRequestedBy,
          type: NotificationType.SYSTEM,
          title: 'Cancellation Approved',
          message: `@${sessionUser.username} approved the cancellation of "${task.title}".`,
          link: `/tasks/${taskId}`,
          actorId: sessionUser.id,
          taskId: taskId,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Cancellation request accepted by both users. Status updated.',
        task: updatedTask,
      });
    }

    return NextResponse.json({ error: 'Unhandled transition request.' }, { status: 400 });

  } catch (error) {
    console.error('Error changing task status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

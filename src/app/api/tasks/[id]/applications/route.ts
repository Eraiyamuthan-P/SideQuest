import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import sendEmail from '@/lib/email';
import { TaskStatus, ApplicationStatus } from '@prisma/client';

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
        poster: { select: { id: true, username: true, email: true, balance: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    if (task.poster_id !== sessionUser.id) {
      return NextResponse.json({ error: 'Only the task poster can manage applications.' }, { status: 403 });
    }

    if (task.status !== TaskStatus.open && task.status !== TaskStatus.assigned) {
      return NextResponse.json({ error: 'This task is not open for selection.' }, { status: 400 });
    }

    // Fetch the target application
    const application = await prisma.taskApplication.findUnique({
      where: { id: application_id },
      include: {
        applicant: { select: { id: true, username: true, email: true } },
      },
    });

    if (!application || application.task_id !== taskId) {
      return NextResponse.json({ error: 'Application not found for this task.' }, { status: 404 });
    }

    if (application.status !== ApplicationStatus.pending) {
      return NextResponse.json({ error: 'This application has already been processed.' }, { status: 400 });
    }

    // Action 1: Reject Application
    if (action === 'reject') {
      const updatedApp = await prisma.taskApplication.update({
        where: { id: application_id },
        data: { status: ApplicationStatus.rejected },
      });
      return NextResponse.json({ success: true, message: 'Application rejected.', application: updatedApp });
    }

    // Action 2: Accept Application
    // Count currently accepted applications
    const acceptedCount = await prisma.taskApplication.count({
      where: { task_id: taskId, status: ApplicationStatus.accepted },
    });

    if (acceptedCount >= task.people_needed) {
      return NextResponse.json({ error: 'The required number of people has already been assigned.' }, { status: 400 });
    }

    // Determine payment and check poster credits if there's a custom offer difference
    const originalBudget = task.budget;
    const finalOffer = application.offer_amount !== null ? application.offer_amount : originalBudget;
    const budgetDifference = finalOffer - originalBudget;

    // Check if poster has enough credits to pay for a higher offer
    if (budgetDifference > 0 && task.poster.balance < budgetDifference) {
      return NextResponse.json({
        error: `Insufficient balance. Accepting this custom offer requires an additional ₹${budgetDifference}, but your current balance is ₹${task.poster.balance}.`
      }, { status: 400 });
    }

    // Process acceptance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update application status to accepted
      const acceptedApp = await tx.taskApplication.update({
        where: { id: application_id },
        data: { status: ApplicationStatus.accepted },
      });

      // 2. Adjust poster credits and log transaction for custom offer differences
      if (budgetDifference !== 0) {
        // If offer is higher, deduct extra credits from poster. If lower, refund the difference.
        await tx.user.update({
          where: { id: task.poster_id },
          data: { balance: { decrement: budgetDifference } },
        });

        await tx.transaction.create({
          data: {
            user_id: task.poster_id,
            amount: -budgetDifference,
            reason: budgetDifference > 0 
              ? `Accepted higher offer (+₹${budgetDifference}) on task: "${task.title}"`
              : `Refund for lower accepted offer (₹${Math.abs(budgetDifference)}) on task: "${task.title}"`,
          },
        });
      }

      const newAcceptedCount = acceptedCount + 1;
      const isNowFullyAssigned = newAcceptedCount >= task.people_needed;

      // 3. Update task status and final payment amount
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          status: isNowFullyAssigned ? TaskStatus.assigned : task.status,
          payment_amount: finalOffer, // updates final payment amount
        },
      });

      // 4. If fully assigned, reject all other pending applications
      if (isNowFullyAssigned) {
        await tx.taskApplication.updateMany({
          where: {
            task_id: taskId,
            status: ApplicationStatus.pending,
          },
          data: { status: ApplicationStatus.rejected },
        });
      }

      // 5. Create introductory chat message
      await tx.message.create({
        data: {
          task_id: taskId,
          sender_id: task.poster_id,
          content: `👋 SideQuest Assigned! @${application.applicant.username} has been assigned to this task. The agreed payment is ₹${finalOffer}.`,
        },
      });

      return { acceptedApp, updatedTask, isNowFullyAssigned };
    });

    // Send notifications
    // 1. Send email to accepted doer
    await sendEmail({
      to: application.applicant.email,
      subject: `[SideQuest Assigned] ${task.title}`,
      text: `Congratulations! @${task.poster.username} has accepted your application for "${task.title}". The final price is agreed at ₹${finalOffer}. Check your inbox to coordinate!`,
      html: `<p>Congratulations! <strong>@${task.poster.username}</strong> has accepted your application for <strong>"${task.title}"</strong>.</p><p>The final payment is <strong>₹${finalOffer}</strong>.</p><p>Go to your chat inbox to coordinate details.</p>`,
    });

    // 2. Send email to poster
    await sendEmail({
      to: task.poster.email,
      subject: `[SideQuest Assignment Confirmation] ${task.title}`,
      text: `You have successfully assigned @${application.applicant.username} to your task "${task.title}".`,
      html: `<p>You have successfully assigned <strong>@${application.applicant.username}</strong> to your task <strong>"${task.title}"</strong>.</p>`,
    });

    return NextResponse.json({
      success: true,
      message: result.isNowFullyAssigned
        ? 'Application accepted! Task is now fully assigned.'
        : 'Application accepted. Waiting for other applicants.',
      application: result.acceptedApp,
      task: result.updatedTask,
    });

  } catch (error) {
    console.error('Error managing applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

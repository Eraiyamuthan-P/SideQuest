import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import sendEmail from '@/lib/email';
import { TaskStatus, ApplicationStatus } from '@prisma/client';

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

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required.' }, { status: 400 });
    }

    const { offer_amount } = await req.json();
    const customOffer = offer_amount ? parseFloat(offer_amount) : null;

    if (customOffer !== null && (isNaN(customOffer) || customOffer <= 0)) {
      return NextResponse.json({ error: 'Offer amount must be a positive number.' }, { status: 400 });
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

    if (task.status !== TaskStatus.open) {
      return NextResponse.json({ error: 'This task is no longer open for applications.' }, { status: 400 });
    }

    // Check if already applied
    const existingApplication = await prisma.taskApplication.findUnique({
      where: {
        task_id_applicant_id: {
          task_id: taskId,
          applicant_id: sessionUser.id,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json({ error: 'You have already applied for this task.' }, { status: 400 });
    }

    // --- APPLY AND ASSIGNMENT LOGIC ---
    const result = await prisma.$transaction(async (tx) => {
      // Create the application
      const application = await tx.taskApplication.create({
        data: {
          task_id: taskId,
          applicant_id: sessionUser.id,
          status: ApplicationStatus.pending,
          offer_amount: customOffer,
        },
      });

      // If assignment mode is first_come, automatically assign the task
      if (task.assignment_mode === 'first_come') {
        // Update application to accepted
        const acceptedApp = await tx.taskApplication.update({
          where: { id: application.id },
          data: { status: ApplicationStatus.accepted },
        });

        // Update task status to assigned and set actual payment amount
        const finalPayment = customOffer !== null ? customOffer : task.budget;
        const updatedTask = await tx.task.update({
          where: { id: taskId },
          data: {
            status: TaskStatus.assigned,
            payment_amount: finalPayment,
          },
        });

        // Reject all other applications (just in case they somehow exist)
        await tx.taskApplication.updateMany({
          where: {
            task_id: taskId,
            id: { not: application.id },
            status: ApplicationStatus.pending,
          },
          data: { status: ApplicationStatus.rejected },
        });

        // Insert first chat system message
        await tx.message.create({
          data: {
            task_id: taskId,
            sender_id: task.poster_id, // sent by system but marked as poster or just intro
            content: `👋 SideQuest Assigned! @${sessionUser.username} has been assigned to this task. The agreed payment is ₹${finalPayment}.`,
          },
        });

        return { assigned: true, application: acceptedApp, task: updatedTask };
      }

      return { assigned: false, application };
    });

    // Send notifications if assigned
    if (result.assigned) {
      // 1. Poster email
      await sendEmail({
        to: task.poster.email,
        subject: `[SideQuest Assigned] ${task.title}`,
        text: `Your task "${task.title}" has been auto-assigned to @${sessionUser.username}. You can now chat and coordinate with them on the platform.`,
        html: `<p>Your task <strong>"${task.title}"</strong> has been auto-assigned to <strong>@${sessionUser.username}</strong>.</p><p>Go to the platform to start chatting and coordinate.</p>`,
      });

      // 2. Doer email
      await sendEmail({
        to: sessionUser.email,
        subject: `[SideQuest Assignment Confirmation] ${task.title}`,
        text: `Congratulations! You have been assigned to "${task.title}". Please log in and check your inbox to coordinate with @${task.poster.username}.`,
        html: `<p>Congratulations! You have been assigned to <strong>"${task.title}"</strong> by <strong>@${task.poster.username}</strong>.</p><p>Please check your inbox to coordinate details.</p>`,
      });
    }

    return NextResponse.json({
      success: true,
      message: result.assigned ? 'Successfully applied and assigned!' : 'Application submitted successfully!',
      assigned: result.assigned,
      application: result.application,
    });

  } catch (error) {
    console.error('Error applying for task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

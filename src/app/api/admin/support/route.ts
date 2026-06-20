import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApplicationStatus } from '@prisma/client';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.username !== 'vit_admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    // Fetch all tickets with user information
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: {
          select: { username: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Also fetch tasks that are in completed state (to easily find disputes)
    const completedTasks = await prisma.task.findMany({
      where: { status: 'completed' },
      include: {
        poster: { select: { username: true } },
        applications: {
          where: { status: ApplicationStatus.accepted },
          include: {
            applicant: { select: { username: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, tickets, completedTasks });

  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || sessionUser.username !== 'vit_admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { ticket_id, status, task_id, resolution } = await req.json();

    if (!ticket_id) {
      return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticket_id },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    // Handle dispute resolution credit adjustments if provided
    if (ticket.type === 'dispute' && task_id && resolution) {
      const task = await prisma.task.findUnique({
        where: { id: task_id },
        include: {
          applications: {
            where: { status: ApplicationStatus.accepted },
          },
        },
      });

      if (!task) {
        return NextResponse.json({ error: 'Task associated with dispute not found.' }, { status: 400 });
      }

      const acceptedApp = task.applications[0] || null;
      if (!acceptedApp) {
        return NextResponse.json({ error: 'No accepted doer found for this task.' }, { status: 400 });
      }

      const finalPayment = task.payment_amount || task.budget;

      await prisma.$transaction(async (tx) => {
        if (resolution === 'favor_poster') {
          // Poster wins:
          // 1. Return task payment amount from Doer's credits back to Poster
          await tx.user.update({
            where: { id: acceptedApp.applicant_id },
            data: { credits: { decrement: finalPayment } },
          });
          await tx.creditTransaction.create({
            data: {
              user_id: acceptedApp.applicant_id,
              amount: -finalPayment,
              reason: `Dispute Resolution: Escrow returned to poster for task "${task.title}"`,
            },
          });

          await tx.user.update({
            where: { id: task.poster_id },
            data: { credits: { increment: finalPayment } },
          });
          await tx.creditTransaction.create({
            data: {
              user_id: task.poster_id,
              amount: finalPayment,
              reason: `Dispute Resolution: Refunded payment for task "${task.title}"`,
            },
          });

          // 2. Penalize Doer (-15 credits)
          await tx.user.update({
            where: { id: acceptedApp.applicant_id },
            data: { credits: { decrement: 15 } },
          });
          await tx.creditTransaction.create({
            data: {
              user_id: acceptedApp.applicant_id,
              amount: -15,
              reason: `Penalty: Dispute resolved against you (Doer) on task "${task.title}"`,
            },
          });

        } else if (resolution === 'favor_doer') {
          // Doer wins:
          // 1. Doer keeps the credits (already transferred on completion).
          // 2. Penalize Poster (-15 credits)
          await tx.user.update({
            where: { id: task.poster_id },
            data: { credits: { decrement: 15 } },
          });
          await tx.creditTransaction.create({
            data: {
              user_id: task.poster_id,
              amount: -15,
              reason: `Penalty: Dispute resolved against you (Poster) on task "${task.title}"`,
            },
          });
        }
      });
    }

    // Update ticket status
    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket_id },
      data: { status: status || 'resolved' },
    });

    return NextResponse.json({
      success: true,
      message: 'Support ticket updated successfully.',
      ticket: updatedTicket,
    });

  } catch (error) {
    console.error('Error updating admin ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

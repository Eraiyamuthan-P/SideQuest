import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApplicationStatus, TaskStatus } from '@prisma/client';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'ADMIN' && sessionUser.role !== 'MODERATOR')) {
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
      where: { status: TaskStatus.COMPLETED },
      include: {
        poster: { select: { username: true } },
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
          include: {
            doer: { select: { username: true } },
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
    if (!sessionUser || (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'ADMIN' && sessionUser.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { ticket_id, status, task_id, resolution, reason } = await req.json();

    if (!ticket_id) {
      return NextResponse.json({ error: 'Ticket ID is required.' }, { status: 400 });
    }

    // Reason validation (10-500 chars) is mandatory for resolving support tickets and disputes
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
      return NextResponse.json({ error: 'Administrative reason must be between 10 and 500 characters long.' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticket_id },
      include: {
        user: { select: { email: true } }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // Handle dispute resolution credit adjustments if provided
    if (ticket.type === 'dispute' && task_id && resolution) {
      const task = await prisma.task.findUnique({
        where: { id: task_id },
        include: {
          applications: {
            where: { status: ApplicationStatus.ACCEPTED },
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

      await prisma.$transaction(async (tx) => {
        if (resolution === 'favor_poster') {
          // Poster wins:
          // 1. Penalize Doer (-15 credits)
          await tx.user.update({
            where: { id: acceptedApp.doerId },
            data: { credits: { decrement: 15 } },
          });

          // 2. Cancel the task and reject application
          await tx.task.update({
            where: { id: task_id },
            data: { status: TaskStatus.CANCELLED },
          });

          await tx.taskApplication.update({
            where: { id: acceptedApp.id },
            data: { status: ApplicationStatus.REJECTED },
          });

          // Record log
          await tx.auditLog.create({
            data: {
              actorId: sessionUser.id,
              actorEmail: sessionUser.email,
              targetId: task_id,
              targetEmail: ticket.user.email,
              action: 'DISPUTE_RESOLUTION_FAVOR_POSTER',
              reason: reason.trim(),
              metadata: { ticketId: ticket_id, resolution: 'favor_poster', oldStatus: TaskStatus.COMPLETED, newStatus: TaskStatus.CANCELLED },
              ipAddress: ipAddress,
            }
          });

        } else if (resolution === 'favor_doer') {
          // Doer wins:
          // 1. Penalize Poster (-15 credits)
          await tx.user.update({
            where: { id: task.poster_id },
            data: { credits: { decrement: 15 } },
          });

          // 2. Award Doer standard completion credits (+10)
          await tx.user.update({
            where: { id: acceptedApp.doerId },
            data: { credits: { increment: 10 } },
          });

          // 3. Complete the task
          await tx.task.update({
            where: { id: task_id },
            data: { status: TaskStatus.COMPLETED },
          });

          // Record log
          await tx.auditLog.create({
            data: {
              actorId: sessionUser.id,
              actorEmail: sessionUser.email,
              targetId: task_id,
              targetEmail: ticket.user.email,
              action: 'DISPUTE_RESOLUTION_FAVOR_DOER',
              reason: reason.trim(),
              metadata: { ticketId: ticket_id, resolution: 'favor_doer', oldStatus: TaskStatus.COMPLETED, newStatus: TaskStatus.COMPLETED },
              ipAddress: ipAddress,
            }
          });
        }
      });
    } else {
      // General ticket resolution audit log
      await prisma.auditLog.create({
        data: {
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          targetId: ticket_id,
          targetEmail: ticket.user.email,
          action: 'SUPPORT_TICKET_RESOLVED',
          reason: reason.trim(),
          metadata: { ticketId: ticket_id, type: ticket.type, oldStatus: ticket.status, newStatus: status || 'resolved' },
          ipAddress: ipAddress,
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

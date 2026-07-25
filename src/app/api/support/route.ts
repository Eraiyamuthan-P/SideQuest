import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import sendEmail from '@/lib/email';
import { SupportTicketType } from '@prisma/client';
import { notifyAllAdmins } from '@/lib/notification';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const { type, subject, message } = await req.json();

    if (!type || !subject || !message) {
      return NextResponse.json({ error: 'Ticket type, subject, and message are required.' }, { status: 400 });
    }

    const allowedTypes = [
      SupportTicketType.contact,
      SupportTicketType.feedback,
      SupportTicketType.bug,
      SupportTicketType.dispute,
    ];

    if (!allowedTypes.includes(type as SupportTicketType)) {
      return NextResponse.json({ error: 'Invalid support ticket type.' }, { status: 400 });
    }

    // Create the ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        user_id: sessionUser.id,
        type: type as SupportTicketType,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
      },
    });

    // Notify all administrative operators
    await notifyAllAdmins({
      type: 'SYSTEM',
      title: type === 'dispute' ? 'New Dispute Ticket' : `New Support Ticket: ${subject.slice(0, 40)}`,
      message: `User @${sessionUser.username} logged: ${message.slice(0, 100)}`,
      link: '/admin',
      actorId: sessionUser.id,
    });

    // Email admin
    await sendEmail({
      to: 'admin@vit.ac.in',
      subject: `[New Support Ticket] ${type.toUpperCase()}: ${subject}`,
      text: `User @${sessionUser.username} (${sessionUser.email}) submitted a support ticket:\n\nSubject: ${subject}\nType: ${type}\nMessage: ${message}`,
      html: `<h3>New Support Ticket</h3><p><strong>From:</strong> @${sessionUser.username} (${sessionUser.email})</p><p><strong>Type:</strong> ${type}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p style="background:#f3f4f6; padding:10px; border-radius:4px;">${message}</p>`,
    });

    return NextResponse.json({
      success: true,
      message: 'Support ticket submitted successfully.',
      ticket,
    });

  } catch (error) {
    console.error('Error submitting support ticket:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

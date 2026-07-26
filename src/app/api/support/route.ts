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

    const priority = type === 'dispute' ? 'high' : type === 'feedback' ? 'low' : 'normal';
    const initialTimeline = [
      { timestamp: new Date().toISOString(), actor: 'System', action: 'Ticket Created', note: 'Submitted via client portal' }
    ];

    // Create the ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        user_id: sessionUser.id,
        type: type as SupportTicketType,
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        priority,
        timeline: initialTimeline,
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

    // Parse user agent for browser & platform
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    let browser = 'Unknown Browser';
    let platform = 'Unknown Platform';
    
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) platform = 'Windows';
    else if (userAgent.includes('Macintosh')) platform = 'macOS';
    else if (userAgent.includes('Linux')) platform = 'Linux';
    else if (userAgent.includes('Android')) platform = 'Android';
    else if (userAgent.includes('iPhone')) platform = 'iOS';

    // Email admin recipients
    const adminRecipients = 'eraiyamuthan.p2023@vitstudent.ac.in, eraiamuthu57@gmail.com';
    const emailSubject = `[SideQuest Support] ${type.toUpperCase()}: ${subject}`;
    const emailText = `User @${sessionUser.username} (${sessionUser.email}) submitted a support ticket:\n\nTicket ID: ${ticket.id}\nSubject: ${subject}\nType: ${type}\nPriority: ${priority}\nMessage: ${message}\nBrowser: ${browser}\nPlatform: ${platform}`;
    
    const emailHtml = `
      <div style="background-color: #0F172A; color: #E2E8F0; font-family: 'Inter', system-ui, sans-serif; padding: 2rem; border-radius: 12px; max-width: 600px; margin: auto; border: 1px solid #1E293B;">
        <div style="border-bottom: 1px solid #1E293B; padding-bottom: 1rem; margin-bottom: 1.5rem;">
          <h2 style="margin: 0; color: #FFFFFF; font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.03em;">
            <span style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;">SideQuest</span> Support System
          </h2>
        </div>
        
        <div style="background-color: #1E293B; padding: 1.5rem; border-radius: 8px; border: 1px solid #334155;">
          <p style="margin-top: 0; font-size: 1.1rem; color: #FFFFFF; font-weight: 700;">New Support Ticket Submitted</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;">
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem; width: 150px;">Ticket ID</td>
              <td style="padding: 6px 0; color: #F1F5F9; font-size: 0.85rem; font-family: monospace;">${ticket.id}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">Timestamp</td>
              <td style="padding: 6px 0; color: #F1F5F9; font-size: 0.85rem;">${new Date(ticket.created_at).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">Username</td>
              <td style="padding: 6px 0; color: #6366F1; font-size: 0.85rem; font-weight: 600;">@${sessionUser.username}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">User Email</td>
              <td style="padding: 6px 0; color: #F1F5F9; font-size: 0.85rem;">${sessionUser.email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">Category</td>
              <td style="padding: 6px 0; color: #F1F5F9; font-size: 0.85rem; text-transform: uppercase;">${ticket.type}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">Priority</td>
              <td style="padding: 6px 0; color: #EF4444; font-size: 0.85rem; font-weight: 700; text-transform: uppercase;">${priority}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">Subject</td>
              <td style="padding: 6px 0; color: #FFFFFF; font-size: 0.85rem; font-weight: 700;">${ticket.subject}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">Browser Info</td>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">${browser}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">Platform Info</td>
              <td style="padding: 6px 0; color: #94A3B8; font-size: 0.85rem;">${platform}</td>
            </tr>
          </table>
          
          <div style="border-top: 1px solid #334155; padding-top: 1rem; margin-top: 1rem;">
            <p style="margin: 0 0 0.5rem 0; color: #94A3B8; font-size: 0.85rem;">Message Body</p>
            <div style="background-color: #0F172A; padding: 1rem; border-radius: 6px; border: 1px solid #334155; color: #E2E8F0; font-size: 0.9rem; white-space: pre-wrap; line-height: 1.5;">${ticket.message}</div>
          </div>
        </div>
        
        <p style="font-size: 0.75rem; color: #64748B; margin-top: 1.5rem; text-align: center; line-height: 1.4;">
          This message was automatically generated by the SideQuest Support System.<br/>
          Please respond through the administrative dashboard or contact the student directly if required.
        </p>
      </div>
    `;

    await sendEmail({
      to: adminRecipients,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
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

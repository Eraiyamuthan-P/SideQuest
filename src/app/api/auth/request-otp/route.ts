import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import sendEmail from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();

    // Verify domain: only @vitstudent.ac.in and @vit.ac.in
    const isValidDomain = lowerEmail.endsWith('@vitstudent.ac.in') || lowerEmail.endsWith('@vit.ac.in');
    
    if (!isValidDomain) {
      return NextResponse.json(
        { error: 'Access restricted. Only @vit.ac.in and @vitstudent.ac.in emails are allowed.' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`🔑 [DEV DEBUG] Generated OTP for ${lowerEmail}: ${otp}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save/upsert OTP
    await prisma.verificationOtp.upsert({
      where: { email: lowerEmail },
      update: {
        otp,
        expires_at: expiresAt,
        created_at: new Date(),
      },
      create: {
        email: lowerEmail,
        otp,
        expires_at: expiresAt,
      },
    });

    // Send email
    const emailSubject = `SideQuest code: ${otp}`;
    const emailText = `Hello student. Your access code is: ${otp}. This code will expire in 10 minutes.`;
    const emailHtml = `<p>Hello student.</p><p>Your access code is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`;

    await sendEmail({
      to: lowerEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    const isDev = false; // Forced false to turn off dev mode helpers as requested
    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email.',
      // Return the OTP in dev response for automated testing or UI ease
      ...(isDev ? { devOtp: otp } : {}),
    });

  } catch (error) {
    console.error('Error in request-otp endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

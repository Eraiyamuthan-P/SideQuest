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
    const emailSubject = `${otp} is your Campus Task App verification code`;
    const emailText = `Your Campus Task App verification OTP is ${otp}. It will expire in 10 minutes.`;
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px;">
        <h2 style="color: #6366f1;">Campus Task App</h2>
        <p>Hello student,</p>
        <p>Use the following verification code to sign up or log in to your account:</p>
        <div style="background-color: #f3f4f6; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 4px; letter-spacing: 4px; margin: 20px 0; color: #1e1b4b;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: lowerEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json({
      success: true,
      message: isDev ? `OTP sent! (Dev mode: OTP is ${otp})` : 'OTP sent to your email.',
      // Return the OTP in dev response for automated testing or UI ease
      ...(isDev && { devOtp: otp }),
    });

  } catch (error) {
    console.error('Error in request-otp endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

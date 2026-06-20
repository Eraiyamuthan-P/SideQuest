import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/jwt';

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const cleanOtp = otp.trim();

    // Find OTP record
    const otpRecord = await prisma.verificationOtp.findUnique({
      where: { email: lowerEmail },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'No OTP requested for this email' }, { status: 400 });
    }

    // Verify OTP
    if (otpRecord.otp !== cleanOtp) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Verify Expiry
    if (new Date() > otpRecord.expires_at) {
      return NextResponse.json({ error: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // OTP is valid! Let's find or create the user
    let user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (!user) {
      // Generate clean username from email prefix (e.g. arjun.s -> arjun_s)
      const emailPrefix = lowerEmail.split('@')[0];
      let baseUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      
      // Check for uniqueness
      let username = baseUsername;
      let count = 0;
      while (true) {
        const existing = await prisma.user.findUnique({
          where: { username },
        });
        if (!existing) break;
        count++;
        username = `${baseUsername}_${count}`;
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          email: lowerEmail,
          username,
          verified: true,
          credits: 100, // starting credits
          bio: 'VIT Student',
        },
      });

      // Record first transaction
      await prisma.creditTransaction.create({
        data: {
          user_id: user.id,
          amount: 100,
          reason: 'Initial sign-up bonus credits',
        },
      });
    } else {
      // If user existed but wasn't verified, mark verified
      if (!user.verified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { verified: true },
        });
      }
    }

    // Clean up OTP record
    await prisma.verificationOtp.delete({
      where: { email: lowerEmail },
    });

    // Create JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // Create Response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        verified: user.verified,
        credits: user.credits,
        bio: user.bio,
        hostel_block: user.hostel_block,
      },
    });

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;

  } catch (error) {
    console.error('Error in verify-otp endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

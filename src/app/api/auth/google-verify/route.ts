import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/jwt';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json({ error: 'Credential token is required' }, { status: 400 });
    }

    if (!GOOGLE_CLIENT_ID) {
      console.error('GOOGLE_CLIENT_ID is not configured in environment variables.');
      return NextResponse.json({ error: 'Google Sign-In is not configured on the server.' }, { status: 500 });
    }

    // Verify Google ID Token
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError: any) {
      console.error('Google token verification failed:', verifyError);
      return NextResponse.json({ error: 'Invalid Google credential token.' }, { status: 400 });
    }

    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Failed to retrieve email from Google profile.' }, { status: 400 });
    }

    const lowerEmail = payload.email.toLowerCase().trim();

    // Verify domain: only @vitstudent.ac.in and @vit.ac.in
    const isValidDomain = lowerEmail.endsWith('@vitstudent.ac.in') || lowerEmail.endsWith('@vit.ac.in');
    
    if (!isValidDomain) {
      return NextResponse.json(
        { error: 'Access restricted. Only @vit.ac.in and @vitstudent.ac.in emails are allowed.' },
        { status: 400 }
      );
    }

    // Find or create the user in database
    let user = await prisma.user.findUnique({
      where: { email: lowerEmail },
    });

    if (!user) {
      // Generate clean username from email prefix (e.g. arjun.s -> arjun_s)
      const emailPrefix = lowerEmail.split('@')[0];
      let baseUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      
      // Ensure username uniqueness
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

      // Check for SUPER_ADMIN email or pending AdminInvitation
      const superAdminEmail = 'eraiyamuthan.p2023@vitstudent.ac.in';
      let initialRole = 'STUDENT';

      if (lowerEmail === superAdminEmail) {
        initialRole = 'SUPER_ADMIN';
      } else {
        const invitation = await prisma.adminInvitation.findUnique({
          where: { email: lowerEmail },
        });
        if (invitation) {
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          const isExpired = Date.now() - new Date(invitation.createdAt).getTime() > thirtyDaysMs;
          if (!isExpired) {
            initialRole = invitation.role;
          }
        }
      }

      // Create new user
      user = await prisma.user.create({
        data: {
          email: lowerEmail,
          username,
          verified: true,
          bio: 'VIT Student',
          role: initialRole as any,
        },
      });

      // Mark invitation as accepted if it exists
      if (initialRole !== 'STUDENT' && lowerEmail !== superAdminEmail) {
        await prisma.adminInvitation.update({
          where: { email: lowerEmail },
          data: { acceptedAt: new Date() },
        });
      }
    } else {
      // If user existed but wasn't verified, mark verified
      if (!user.verified) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { verified: true },
        });
      }
    }

    // Create session JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      sessionVersion: user.sessionVersion,
    });

    // Create response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        verified: user.verified,
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
    console.error('Error in google-verify endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, bio, hostel_block } = await req.json();

    const updateData: { username?: string; bio?: string; hostel_block?: string } = {};

    // Validate and update username
    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
      
      if (cleanUsername.length < 3) {
        return NextResponse.json({ error: 'Username must be at least 3 characters long and contain only letters, numbers, or underscores.' }, { status: 400 });
      }

      if (cleanUsername !== sessionUser.username) {
        // Check if taken
        const existing = await prisma.user.findUnique({
          where: { username: cleanUsername },
        });
        if (existing) {
          return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
        }
        updateData.username = cleanUsername;
      }
    }

    // Update bio
    if (bio !== undefined) {
      updateData.bio = bio.trim();
    }

    // Update hostel block
    if (hostel_block !== undefined) {
      updateData.hostel_block = hostel_block.trim();
    }

    // Perform update
    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        verified: true,
        credits: true,
        bio: true,
        hostel_block: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile settings updated successfully!',
      user: updatedUser,
    });

  } catch (error) {
    console.error('Error updating profile settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

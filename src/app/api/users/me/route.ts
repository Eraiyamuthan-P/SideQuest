import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Availability } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        username: true,
        email: true,
        verified: true,
        bio: true,
        hostel_block: true,
        availability: true,
        skills: true,
        pref_notify_chat: true,
        pref_notify_applications: true,
        pref_notify_reviews: true,
        pref_notify_tasks: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionUser.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Forbidden. Suspended accounts have read-only access.' }, { status: 403 });
    }

    const {
      username,
      bio,
      hostel_block,
      availability,
      skills,
      pref_notify_chat,
      pref_notify_applications,
      pref_notify_reviews,
      pref_notify_tasks,
      activeChatTaskId,
    } = await req.json();

    const updateData: any = {};

    // Validate and update username
    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-zA-Z0-9_]/g, '');
      
      if (cleanUsername.length < 3) {
        return NextResponse.json({ error: 'Username must be at least 3 characters long and contain only letters, numbers, or underscores.' }, { status: 400 });
      }

      if (cleanUsername !== sessionUser.username) {
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

    // Update availability
    if (availability !== undefined) {
      if (availability !== Availability.AVAILABLE && availability !== Availability.BUSY) {
        return NextResponse.json({ error: 'Invalid availability status.' }, { status: 400 });
      }
      updateData.availability = availability;
    }

    // Update and validate skills
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return NextResponse.json({ error: 'Skills must be an array of strings.' }, { status: 400 });
      }

      // Sanitize and filter duplicates/empty entries
      const sanitized = Array.from(new Set(skills.map(s => String(s).trim()).filter(Boolean)));

      if (sanitized.length > 10) {
        return NextResponse.json({ error: 'You can have a maximum of 10 skills.' }, { status: 400 });
      }

      for (const skill of sanitized) {
        if (skill.length > 25) {
          return NextResponse.json({ error: 'Each skill must be 25 characters or fewer.' }, { status: 400 });
        }
      }

      updateData.skills = sanitized;
    }

    // Update notification preferences
    if (pref_notify_chat !== undefined) updateData.pref_notify_chat = !!pref_notify_chat;
    if (pref_notify_applications !== undefined) updateData.pref_notify_applications = !!pref_notify_applications;
    if (pref_notify_reviews !== undefined) updateData.pref_notify_reviews = !!pref_notify_reviews;
    if (pref_notify_tasks !== undefined) updateData.pref_notify_tasks = !!pref_notify_tasks;

    // Support clearing active chat room status on unmount
    if (activeChatTaskId !== undefined) {
      updateData.activeChatTaskId = activeChatTaskId;
      if (activeChatTaskId === null) {
        updateData.lastChatActiveAt = null;
      }
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
        bio: true,
        hostel_block: true,
        availability: true,
        skills: true,
        pref_notify_chat: true,
        pref_notify_applications: true,
        pref_notify_reviews: true,
        pref_notify_tasks: true,
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

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApplicationStatus } from '@prisma/client';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch tasks where this user is the poster and has an assigned doer
    const postedConversations = await prisma.task.findMany({
      where: {
        poster_id: sessionUser.id,
        applications: {
          some: { status: ApplicationStatus.ACCEPTED },
        },
      },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
          include: {
            doer: {
              select: { id: true, username: true, verified: true },
            },
          },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    // 2. Fetch tasks where this user is the accepted doer
    const doerConversations = await prisma.task.findMany({
      where: {
        applications: {
          some: {
            doerId: sessionUser.id,
            status: ApplicationStatus.ACCEPTED,
          },
        },
      },
      include: {
        poster: {
          select: { id: true, username: true, verified: true },
        },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
        },
      },
    });

    // Combine and format conversations
    const inboxList: any[] = [];

    // Process posted tasks (user is Poster, other is Doer)
    for (const task of postedConversations) {
      // There can be multiple accepted doers if people_needed > 1, but we map them
      task.applications.forEach((app) => {
        const otherUser = app.doer;
        const lastMsg = task.messages[0] || null;
        
        inboxList.push({
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          otherUser,
          lastMessage: lastMsg ? {
            content: lastMsg.content,
            created_at: lastMsg.created_at,
            senderId: lastMsg.sender_id,
          } : null,
        });
      });
    }

    // Process doer tasks (user is Doer, other is Poster)
    for (const task of doerConversations) {
      const otherUser = task.poster;
      const lastMsg = task.messages[0] || null;

      inboxList.push({
        taskId: task.id,
        taskTitle: task.title,
        taskStatus: task.status,
        otherUser,
        lastMessage: lastMsg ? {
          content: lastMsg.content,
          created_at: lastMsg.created_at,
          senderId: lastMsg.sender_id,
        } : null,
      });
    }

    // Sort inbox list by last message time DESC (conversations with no messages go to bottom)
    inboxList.sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ success: true, inbox: inboxList });

  } catch (error) {
    console.error('Error generating chat inbox:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

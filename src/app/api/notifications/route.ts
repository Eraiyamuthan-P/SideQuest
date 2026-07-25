import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const notifications = await prisma.notification.findMany({
      where: { user_id: sessionUser.id },
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            verified: true,
          }
        },
        task: {
          select: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, markAll } = await req.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: { user_id: sessionUser.id, is_read: false },
        data: { is_read: true },
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    // Verify ownership
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    }

    if (notification.user_id !== sessionUser.id) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error) {
    console.error('Error updating notification status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

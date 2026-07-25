import prisma from './prisma';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  actorId?: string;
  taskId?: string;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  actorId,
  taskId,
}: CreateNotificationParams) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        pref_notify_chat: true,
        pref_notify_applications: true,
        pref_notify_reviews: true,
        pref_notify_tasks: true,
        lastChatActiveAt: true,
      },
    });

    if (!user) return null;

    // Suppression logic: If recipient is actively chatting (last 10s), suppress CHAT notifications
    if (type === NotificationType.CHAT && user.lastChatActiveAt) {
      const timeSinceActive = Date.now() - new Date(user.lastChatActiveAt).getTime();
      if (timeSinceActive < 10000) {
        return null;
      }
    }

    // Check preferences
    let isEnabled = true;
    if (type === NotificationType.CHAT && !user.pref_notify_chat) isEnabled = false;
    if (type === NotificationType.BID && !user.pref_notify_applications) isEnabled = false;
    if (type === NotificationType.ASSIGNMENT && !user.pref_notify_applications) isEnabled = false;
    if (type === NotificationType.REJECTION && !user.pref_notify_applications) isEnabled = false;
    if (type === NotificationType.REVIEW && !user.pref_notify_reviews) isEnabled = false;
    if (type === NotificationType.COMPLETION && !user.pref_notify_tasks) isEnabled = false;
    if (type === NotificationType.SYSTEM && !user.pref_notify_tasks) isEnabled = false;

    if (!isEnabled) {
      return null;
    }

    // 1. Create the notification with rich relations
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        link: link || null,
        actorId: actorId || null,
        taskId: taskId || null,
      },
    });

    // 2. Retention Policy: Clean up notifications older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    await prisma.notification.deleteMany({
      where: {
        user_id: userId,
        created_at: { lt: ninetyDaysAgo },
      },
    });

    // 3. Retention Policy: Keep only the latest 200 notifications per user
    const totalCount = await prisma.notification.count({
      where: { user_id: userId },
    });

    if (totalCount > 200) {
      const oldestToKeep = await prisma.notification.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip: 199,
        take: 1,
        select: { created_at: true },
      });

      if (oldestToKeep.length > 0) {
        await prisma.notification.deleteMany({
          where: {
            user_id: userId,
            created_at: { lt: oldestToKeep[0].created_at },
          },
        });
      }
    }

    return notification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
}

export async function notifyAllAdmins({
  type,
  title,
  message,
  link,
  actorId,
  taskId,
}: Omit<CreateNotificationParams, 'userId'>) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] }
      },
      select: { id: true }
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          user_id: admin.id,
          type,
          title,
          message,
          link: link || null,
          actorId: actorId || null,
          taskId: taskId || null,
        },
      });
    }
  } catch (error) {
    console.error('Error in notifyAllAdmins:', error);
  }
}

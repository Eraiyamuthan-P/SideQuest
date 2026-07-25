import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const dateFilter = searchParams.get('dateFilter') || 'ALL'; // TODAY, 7_DAYS, 30_DAYS, CUSTOM
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const actionCategory = searchParams.get('actionCategory') || 'ALL'; // ROLE, SUSPENSION, QUEST, SUPPORT, REPORT

    const where: any = {};

    // 1. Text Search: email, username, action
    if (search) {
      where.OR = [
        { actorEmail: { contains: search, mode: 'insensitive' } },
        { targetEmail: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { actor: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // 2. Date Filtering
    if (dateFilter === 'TODAY') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      where.createdAt = { gte: startOfToday };
    } else if (dateFilter === '7_DAYS') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      where.createdAt = { gte: sevenDaysAgo };
    } else if (dateFilter === '30_DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.createdAt = { gte: thirtyDaysAgo };
    } else if (dateFilter === 'CUSTOM' && startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    // 3. Action Category Filtering
    if (actionCategory === 'ROLE') {
      where.action = { in: ['ROLE_UPDATED', 'INVITATION_CREATED', 'INVITATION_CANCELLED', 'INVITATION_ROLE_CHANGED'] };
    } else if (actionCategory === 'SUSPENSION') {
      where.action = { in: ['USER_SUSPEND_USER', 'USER_BAN_USER', 'USER_RESTORE_USER', 'USER_DELETE_USER'] };
    } else if (actionCategory === 'QUEST') {
      where.action = { in: ['QUEST_FORCE_COMPLETE', 'QUEST_FORCE_CANCEL', 'QUEST_REOPEN_QUEST', 'QUEST_RESOLVE_DISPUTE'] };
    } else if (actionCategory === 'SUPPORT') {
      where.action = { in: ['SUPPORT_TICKET_RESOLVED', 'DISPUTE_RESOLUTION_FAVOR_POSTER', 'DISPUTE_RESOLUTION_FAVOR_DOER'] };
    } else if (actionCategory === 'REPORT') {
      where.action = { contains: 'DISPUTE' };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            username: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    console.error('Audit logs query error:', error);
    return NextResponse.json({ error: 'Failed to retrieve audit logs.' }, { status: 500 });
  }
}

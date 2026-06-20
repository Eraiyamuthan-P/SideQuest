import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch transactions (INR)
    const transactions = await prisma.transaction.findMany({
      where: { user_id: sessionUser.id },
      orderBy: { created_at: 'desc' },
    });

    // Also fetch tasks completed as doer to show earning history
    const completedTasksAsDoer = await prisma.task.findMany({
      where: {
        status: 'completed',
        applications: {
          some: {
            applicant_id: sessionUser.id,
            status: 'accepted',
          },
        },
      },
      select: {
        id: true,
        title: true,
        budget: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      transactions,
      earnings: completedTasksAsDoer,
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

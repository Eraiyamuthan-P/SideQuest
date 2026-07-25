import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';

export async function GET() {
  try {
    const totalStudents = await prisma.user.count();
    const completedQuests = await prisma.task.count({
      where: { status: TaskStatus.COMPLETED },
    });
    const openQuests = await prisma.task.count({
      where: { status: TaskStatus.OPEN },
    });

    const aggregate = await prisma.user.aggregate({
      where: { ratingCount: { gt: 0 } },
      _avg: {
        ratingAverage: true,
      },
    });

    const averageRating = aggregate._avg.ratingAverage 
      ? parseFloat(aggregate._avg.ratingAverage.toFixed(1)) 
      : null;

    return NextResponse.json({
      success: true,
      totalStudents,
      completedQuests,
      openQuests,
      averageRating,
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats.' },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';

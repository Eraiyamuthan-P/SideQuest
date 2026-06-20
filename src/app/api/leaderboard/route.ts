import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Rank users by credits DESC, limiting to Top 50
    const topUsers = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        verified: true,
        credits: true,
      },
      orderBy: {
        credits: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      leaderboard: topUsers,
    });
  } catch (error) {
    console.error('Error generating leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';

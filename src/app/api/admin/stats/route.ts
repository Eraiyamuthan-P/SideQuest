import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    // 1. Query all totals and growth metrics in parallel
    const [
      totalUsers,
      totalQuests,
      openQuests,
      completedQuests,
      disputedQuests,
      week1Users,
      week2Users,
      week3Users,
      week1Quests,
      week2Quests,
      week3Quests,
      rating5,
      rating4,
      rating3,
      rating2,
      rating1,
      // Hardened overview counts
      totalStudents,
      totalModerators,
      totalAdmins,
      totalSuperAdmins,
      pendingInvitations,
      activeDisputes,
      openReports,
      supportTickets
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'OPEN' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count({ where: { status: 'DISPUTED' } }),
      prisma.user.count({ where: { created_at: { lt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) } } }),
      prisma.user.count({ where: { created_at: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } }),
      prisma.user.count({ where: { created_at: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.task.count({ where: { created_at: { lt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) } } }),
      prisma.task.count({ where: { created_at: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } }),
      prisma.task.count({ where: { created_at: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.user.count({ where: { ratingAverage: { gte: 4.5 } } }),
      prisma.user.count({ where: { ratingAverage: { gte: 3.5, lt: 4.5 } } }),
      prisma.user.count({ where: { ratingAverage: { gte: 2.5, lt: 3.5 } } }),
      prisma.user.count({ where: { ratingAverage: { gte: 1.5, lt: 2.5 } } }),
      prisma.user.count({ where: { ratingAverage: { gt: 0, lt: 1.5 } } }),
      // Role details
      prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
      prisma.user.count({ where: { role: 'MODERATOR', deletedAt: null } }),
      prisma.user.count({ where: { role: 'ADMIN', deletedAt: null } }),
      prisma.user.count({ where: { role: 'SUPER_ADMIN', deletedAt: null } }),
      // Invitations & tickets
      prisma.adminInvitation.count({ where: { acceptedAt: null } }),
      prisma.task.count({ where: { status: 'DISPUTED' } }),
      prisma.supportTicket.count({ where: { type: 'dispute', status: 'open' } }),
      prisma.supportTicket.count({ where: { type: { not: 'dispute' }, status: 'open' } })
    ]);
    
    // 2. Completion rate
    const completionRate = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;

    // 3. User Growth (New Users last 4 weeks)
    const usersByWeek = [
      { label: 'Week 1', count: week1Users },
      { label: 'Week 2', count: week2Users },
      { label: 'Week 3', count: week3Users },
      { label: 'Week 4', count: totalUsers }
    ];

    // 4. Quest Creations last 4 weeks
    const questsByWeek = [
      { label: 'Week 1', count: week1Quests },
      { label: 'Week 2', count: week2Quests },
      { label: 'Week 3', count: week3Quests },
      { label: 'Week 4', count: totalQuests }
    ];

    // 5. Category distribution
    const categories = ['TUTORING', 'FOOD_PICKUP', 'RIDE_SHARING', 'PARCEL_DELIVERY', 'SHOPPING', 'CODING_HELP', 'NOTES', 'PRINTING', 'HOSTEL_HELP', 'EVENT_ASSISTANCE'];
    const categoryDistribution = await Promise.all(
      categories.map(async (cat) => {
        const count = await prisma.task.count({ where: { category: cat as any } });
        return { label: cat.replace('_', ' '), count };
      })
    );

    // 6. Rating distribution (1 to 5 stars)
    const ratingDistribution = [
      { rating: 5, count: rating5 },
      { rating: 4, count: rating4 },
      { rating: 3, count: rating3 },
      { rating: 2, count: rating2 },
      { rating: 1, count: rating1 }
    ];

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalQuests,
        openQuests,
        completedQuests,
        disputedQuests,
        completionRate,
        usersByWeek,
        questsByWeek,
        categoryDistribution,
        ratingDistribution,
        // Expanded metrics
        totalStudents,
        totalModerators,
        totalAdmins,
        totalSuperAdmins,
        pendingInvitations,
        activeDisputes,
        openReports,
        supportTickets
      }
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to retrieve stats.' }, { status: 500 });
  }
}

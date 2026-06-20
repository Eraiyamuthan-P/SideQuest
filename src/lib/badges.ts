import prisma from './prisma';

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  try {
    const existingBadges = await prisma.badge.findMany({
      where: { user_id: userId },
      select: { badge_type: true },
    });
    const badgeTypes = existingBadges.map(b => b.badge_type);
    const newBadges: string[] = [];

    // 1. Check Doer Thresholds (tasks completed as doer)
    const completedDoerCount = await prisma.task.count({
      where: {
        status: 'completed',
        applications: {
          some: {
            applicant_id: userId,
            status: 'accepted',
          },
        },
      },
    });

    if (completedDoerCount >= 5 && !badgeTypes.includes('DOER_5_COMPLETED')) {
      await prisma.badge.create({
        data: { user_id: userId, badge_type: 'DOER_5_COMPLETED' },
      });
      newBadges.push('DOER_5_COMPLETED');
    }
    if (completedDoerCount >= 10 && !badgeTypes.includes('DOER_10_COMPLETED')) {
      await prisma.badge.create({
        data: { user_id: userId, badge_type: 'DOER_10_COMPLETED' },
      });
      newBadges.push('DOER_10_COMPLETED');
    }

    // 2. Check Poster Thresholds (tasks completed as poster)
    const completedPosterCount = await prisma.task.count({
      where: {
        poster_id: userId,
        status: 'completed',
      },
    });

    if (completedPosterCount >= 5 && !badgeTypes.includes('POSTER_5_COMPLETED')) {
      await prisma.badge.create({
        data: { user_id: userId, badge_type: 'POSTER_5_COMPLETED' },
      });
      newBadges.push('POSTER_5_COMPLETED');
    }
    if (completedPosterCount >= 10 && !badgeTypes.includes('POSTER_10_COMPLETED')) {
      await prisma.badge.create({
        data: { user_id: userId, badge_type: 'POSTER_10_COMPLETED' },
      });
      newBadges.push('POSTER_10_COMPLETED');
    }

    return newBadges;
  } catch (error) {
    console.error('Error auto-awarding badges:', error);
    return [];
  }
}

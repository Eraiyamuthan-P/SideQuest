import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const resolvedParams = await params;
    const username = resolvedParams.username;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        verified: true,
        balance: true,
        bio: true,
        hostel_block: true,
        created_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // --- POSTER STATS ---
    // Total posted tasks
    const totalPosted = await prisma.task.count({
      where: { poster_id: user.id },
    });

    // Completed posted tasks
    const postedCompleted = await prisma.task.count({
      where: { poster_id: user.id, status: 'completed' },
    });

    // Cancelled posted tasks
    const postedCancelled = await prisma.task.count({
      where: { poster_id: user.id, status: 'cancelled' },
    });

    const posterClosedTotal = postedCompleted + postedCancelled;
    const posterCompletionRate = posterClosedTotal > 0 
      ? Math.round((postedCompleted / posterClosedTotal) * 100) 
      : 100;
    const posterCancellationRate = posterClosedTotal > 0 
      ? Math.round((postedCancelled / posterClosedTotal) * 100) 
      : 0;

    // Poster Reviews (Reviews written by DOERs about the POSTER)
    const posterReviews = await prisma.review.findMany({
      where: { reviewee_id: user.id, role: 'doer' },
      include: {
        reviewer: {
          select: { username: true }
        },
        task: {
          select: { title: true }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    const averagePosterRating = posterReviews.length > 0
      ? Number((posterReviews.reduce((sum, r) => sum + r.rating, 0) / posterReviews.length).toFixed(1))
      : 0.0;

    // --- DOER STATS ---
    // Tasks completed as doer
    const doerCompleted = await prisma.task.count({
      where: {
        status: 'completed',
        applications: {
          some: {
            applicant_id: user.id,
            status: 'accepted',
          },
        },
      },
    });

    // Count doer cancellations based on transactions
    const doerCancelled = await prisma.transaction.count({
      where: {
        user_id: user.id,
        reason: {
          contains: 'Cancelled assignment',
        },
      },
    });

    const doerClosedTotal = doerCompleted + doerCancelled;
    const doerCompletionRate = doerClosedTotal > 0
      ? Math.round((doerCompleted / doerClosedTotal) * 100)
      : 100;

    // Doer Reviews (Reviews written by POSTERs about the DOER)
    const doerReviews = await prisma.review.findMany({
      where: { reviewee_id: user.id, role: 'poster' },
      include: {
        reviewer: {
          select: { username: true }
        },
        task: {
          select: { title: true }
        }
      },
      orderBy: { created_at: 'desc' },
    });

    const averageDoerRating = doerReviews.length > 0
      ? Number((doerReviews.reduce((sum, r) => sum + r.rating, 0) / doerReviews.length).toFixed(1))
      : 0.0;

    // Badges
    const badges = await prisma.badge.findMany({
      where: { user_id: user.id },
      orderBy: { earned_at: 'desc' },
    });

    // Extract dynamic skills based on task categories completed
    const completedTasksForSkills = await prisma.task.findMany({
      where: {
        status: 'completed',
        applications: {
          some: {
            applicant_id: user.id,
            status: 'accepted',
          },
        },
      },
      select: { category: true },
      distinct: ['category'],
    });
    
    const skillTags = completedTasksForSkills.map(t => t.category);
    // Add default tags based on bio keywords if available
    const bioText = (user.bio || '').toLowerCase();
    const commonSkills = ['java', 'python', 'math', 'calculus', 'physics', 'proofreading', 'editing', 'drawing', 'coding', 'react'];
    commonSkills.forEach(skill => {
      if (bioText.includes(skill) && !skillTags.includes(skill)) {
        // Capitalize first letter
        skillTags.push(skill.charAt(0).toUpperCase() + skill.slice(1));
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        verified: user.verified,
        balance: user.balance,
        bio: user.bio,
        hostel_block: user.hostel_block,
        created_at: user.created_at,
      },
      posterStats: {
        totalPosted,
        completedCount: postedCompleted,
        cancelledCount: postedCancelled,
        completionRate: posterCompletionRate,
        cancellationRate: posterCancellationRate,
        averageRating: averagePosterRating,
        reviews: posterReviews,
      },
      doerStats: {
        completedCount: doerCompleted,
        cancelledCount: doerCancelled,
        completionRate: doerCompletionRate,
        averageRating: averageDoerRating,
        reviews: doerReviews,
        badges,
        skillTags: skillTags.length > 0 ? skillTags : ['Student'],
      }
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

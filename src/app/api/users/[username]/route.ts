import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { TaskStatus, ApplicationStatus } from '@prisma/client';

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

    const sessionUser = await getSessionUser();
    const isOwner = sessionUser ? sessionUser.username === username : false;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        verified: true,
        credits: true,
        ratingAverage: true,
        ratingCount: true,
        bio: true,
        hostel_block: true,
        created_at: true,
        availability: true,
        skills: true,
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
      where: { poster_id: user.id, status: TaskStatus.COMPLETED },
    });

    // Cancelled posted tasks
    const postedCancelled = await prisma.task.count({
      where: { poster_id: user.id, status: TaskStatus.CANCELLED },
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
        status: TaskStatus.COMPLETED,
        applications: {
          some: {
            doerId: user.id,
            status: ApplicationStatus.ACCEPTED,
          },
        },
      },
    });

    // Count doer cancellations is 0 since Transactions are removed
    const doerCancelled = 0;

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
        status: TaskStatus.COMPLETED,
        applications: {
          some: {
            doerId: user.id,
            status: ApplicationStatus.ACCEPTED,
          },
        },
      },
      select: { category: true },
      distinct: ['category'],
    });
    
    const skillTags = completedTasksForSkills.map(t => t.category as string);
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
        credits: user.credits,
        ratingAverage: user.ratingAverage,
        ratingCount: user.ratingCount,
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

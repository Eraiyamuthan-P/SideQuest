import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { TaskStatus, ApplicationStatus, ReviewRole, NotificationType } from '@prisma/client';
import { createNotification } from '@/lib/notification';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required.' }, { status: 400 });
    }

    const { rating, comment } = await req.json();
    const parsedRating = parseInt(rating, 10);

    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5.' }, { status: 400 });
    }

    // 1. Fetch the task with its accepted application
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        applications: {
          where: { status: ApplicationStatus.ACCEPTED },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    // 2. Reviews are only allowed after task is COMPLETED
    if (task.status !== TaskStatus.COMPLETED) {
      return NextResponse.json({ error: 'You can only review after the task is completed.' }, { status: 400 });
    }

    const acceptedApp = task.applications[0];
    if (!acceptedApp) {
      return NextResponse.json({ error: 'No accepted doer found for this task.' }, { status: 400 });
    }

    // Determine roles and targets
    let reviewerRole: ReviewRole;
    let revieweeId: string;

    if (task.poster_id === sessionUser.id) {
      reviewerRole = ReviewRole.poster;
      revieweeId = acceptedApp.doerId;
    } else if (acceptedApp.doerId === sessionUser.id) {
      reviewerRole = ReviewRole.doer;
      revieweeId = task.poster_id;
    } else {
      return NextResponse.json({ error: 'Only the assigned poster or doer can submit reviews.' }, { status: 403 });
    }

    // 3. Prevent duplicate reviews (Check unique constraint)
    const existingReview = await prisma.review.findUnique({
      where: {
        task_id_reviewer_id: {
          task_id: taskId,
          reviewer_id: sessionUser.id,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json({ error: 'You have already submitted a review for this task.' }, { status: 400 });
    }

    // 4. Save review and update cached user rating average in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          task_id: taskId,
          reviewer_id: sessionUser.id,
          reviewee_id: revieweeId,
          role: reviewerRole,
          rating: parsedRating,
          comment: comment || '',
        },
      });

      const targetUser = await tx.user.findUnique({
        where: { id: revieweeId },
        select: { ratingAverage: true, ratingCount: true },
      });

      if (targetUser) {
        const oldCount = targetUser.ratingCount;
        const oldAverage = targetUser.ratingAverage;
        const newCount = oldCount + 1;
        const newAverage = (oldAverage * oldCount + parsedRating) / newCount;

        await tx.user.update({
          where: { id: revieweeId },
          data: {
            ratingAverage: newAverage,
            ratingCount: newCount,
          },
        });
      }

      return review;
    });

    // Create Notification
    await createNotification({
      userId: revieweeId,
      type: NotificationType.REVIEW,
      title: 'New Review Received',
      message: `@${sessionUser.username} left you a ${parsedRating}-star review for "${task.title}".`,
      link: `/tasks/${taskId}`,
      actorId: sessionUser.id,
      taskId: taskId,
    });

    return NextResponse.json({ success: true, review: result });

  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required.' }, { status: 400 });
    }

    const { rating, comment } = await req.json();
    const parsedRating = parseInt(rating, 10);

    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: 'Rating must be an integer between 1 and 5.' }, { status: 400 });
    }

    // 1. Fetch the existing review
    const existingReview = await prisma.review.findUnique({
      where: {
        task_id_reviewer_id: {
          task_id: taskId,
          reviewer_id: sessionUser.id,
        },
      },
    });

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    }

    // 2. Validate 24-hour window
    const createdTime = new Date(existingReview.created_at).getTime();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    if (Date.now() - createdTime > twentyFourHoursMs) {
      return NextResponse.json({ error: 'The 24-hour window to edit this review has expired.' }, { status: 400 });
    }

    const revieweeId = existingReview.reviewee_id;
    const oldRating = existingReview.rating;

    // 3. Update review and recalculate user's cached average rating in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedReview = await tx.review.update({
        where: { id: existingReview.id },
        data: {
          rating: parsedRating,
          comment: comment || '',
        },
      });

      const targetUser = await tx.user.findUnique({
        where: { id: revieweeId },
        select: { ratingAverage: true, ratingCount: true },
      });

      if (targetUser && targetUser.ratingCount > 0) {
        const count = targetUser.ratingCount;
        const oldAverage = targetUser.ratingAverage;
        const newAverage = (oldAverage * count - oldRating + parsedRating) / count;

        await tx.user.update({
          where: { id: revieweeId },
          data: {
            ratingAverage: newAverage,
          },
        });
      }

      return updatedReview;
    });

    return NextResponse.json({ success: true, review: result });

  } catch (error) {
    console.error('Error editing review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

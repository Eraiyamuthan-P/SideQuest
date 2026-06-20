import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getSessionUser();
    const resolvedParams = await params;
    const id = resolvedParams.id;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Fetch task details
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        poster: {
          select: {
            id: true,
            username: true,
            verified: true,
            hostel_block: true,
            bio: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Determine user role and fetch applications accordingly
    let applications: any[] = [];
    let isPoster = false;
    let myApplication = null;

    if (sessionUser) {
      isPoster = task.poster_id === sessionUser.id;

      if (isPoster) {
        // Poster can see all applications and offers
        applications = await prisma.taskApplication.findMany({
          where: { task_id: id },
          include: {
            applicant: {
              select: {
                id: true,
                username: true,
                verified: true,
                hostel_block: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        });
      } else {
        // Regular user can only see their own application
        const app = await prisma.taskApplication.findUnique({
          where: {
            task_id_applicant_id: {
              task_id: id,
              applicant_id: sessionUser.id,
            },
          },
        });
        if (app) {
          myApplication = app;
        }
      }
    }

    // Count of total applications
    const totalApplicantsCount = await prisma.taskApplication.count({
      where: { task_id: id },
    });

    return NextResponse.json({
      success: true,
      task,
      isPoster,
      applications: isPoster ? applications : undefined,
      myApplication,
      applicantsCount: totalApplicantsCount,
    });

  } catch (error) {
    console.error('Error fetching task details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

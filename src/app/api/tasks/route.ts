import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { TaskStatus, AssignmentMode, TaskCategory, TaskLocation, EstimatedDuration } from '@prisma/client';

const ACADEMIC_BLOCKED_KEYWORDS = [
  'assignment', 'exam', 'quiz', 'test', 'homework', 'essay', 'thesis', 'project help',
  'coursework', 'write for me', 'do my exam', 'take my quiz', 'impersonate', 'proxy exam',
  'midterm', 'endterm', 'cat1', 'cat2', 'fat'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse filters
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const budgetMin = searchParams.get('budgetMin') ? parseInt(searchParams.get('budgetMin')!) : undefined;
    const budgetMax = searchParams.get('budgetMax') ? parseInt(searchParams.get('budgetMax')!) : undefined;
    const deadlineMin = searchParams.get('deadlineMin') ? new Date(searchParams.get('deadlineMin')!) : undefined;
    const deadlineMax = searchParams.get('deadlineMax') ? new Date(searchParams.get('deadlineMax')!) : undefined;
    const dateMin = searchParams.get('dateMin') ? new Date(searchParams.get('dateMin')!) : undefined;
    const dateMax = searchParams.get('dateMax') ? new Date(searchParams.get('dateMax')!) : undefined;
    
    // Status filter: default to OPEN tasks, but allow fetching others
    const statusParam = searchParams.get('status');
    let status: TaskStatus = TaskStatus.OPEN;
    if (statusParam) {
      const normalizedStatus = statusParam.toUpperCase();
      if (Object.values(TaskStatus).includes(normalizedStatus as TaskStatus)) {
        status = normalizedStatus as TaskStatus;
      }
    }

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Build where clause
    const where: any = {
      status: status,
    };

    if (status === TaskStatus.OPEN) {
      where.deadline = { gt: new Date() };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && category !== 'All') {
      where.category = category;
    }

    if (budgetMin !== undefined || budgetMax !== undefined) {
      where.offeredAmount = {};
      if (budgetMin !== undefined) where.offeredAmount.gte = budgetMin;
      if (budgetMax !== undefined) where.offeredAmount.lte = budgetMax;
    }

    if (deadlineMin !== undefined || deadlineMax !== undefined) {
      where.deadline = where.deadline || {};
      if (deadlineMin !== undefined) where.deadline.gte = deadlineMin;
      if (deadlineMax !== undefined) where.deadline.lte = deadlineMax;
    }

    if (dateMin !== undefined || dateMax !== undefined) {
      where.created_at = {};
      if (dateMin !== undefined) where.created_at.gte = dateMin;
      if (dateMax !== undefined) where.created_at.lte = dateMax;
    }

    // Build orderBy clause
    let orderBy: any = [{ isUrgent: 'desc' }, { created_at: 'desc' }];
    if (sortBy === 'budget_asc') {
      orderBy = [{ isUrgent: 'desc' }, { offeredAmount: 'asc' }];
    } else if (sortBy === 'budget_desc') {
      orderBy = [{ isUrgent: 'desc' }, { offeredAmount: 'desc' }];
    } else if (sortBy === 'oldest') {
      orderBy = [{ isUrgent: 'desc' }, { created_at: 'asc' }];
    }

    const sessionUser = await getSessionUser();

    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      include: {
        poster: {
          select: {
            id: true,
            username: true,
            verified: true,
            ratingAverage: true,
            ratingCount: true,
          },
        },
        _count: {
          select: { applications: true },
        },
        applications: sessionUser
          ? {
              where: { doerId: sessionUser.id },
              select: { id: true, status: true },
            }
          : undefined,
      },
    });

    return NextResponse.json({ success: true, tasks });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    if (sessionUser.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Forbidden. Suspended accounts have read-only access.' }, { status: 403 });
    }

    const {
      title,
      description,
      photo_url,
      category,
      people_needed,
      offeredAmount,
      deadline,
      location,
      assignment_mode,
      isUrgent,
      estimatedDuration,
    } = await req.json();

    // 1. Basic Validations
    if (!title || !description || !category || offeredAmount === undefined || !deadline || !location || !assignment_mode) {
      return NextResponse.json({ error: 'All fields (title, description, category, offeredAmount, deadline, location, assignment mode) are required.' }, { status: 400 });
    }

    const parsedAmount = parseInt(offeredAmount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Offered amount must be a positive integer greater than 0.' }, { status: 400 });
    }

    const parsedPeople = parseInt(people_needed, 10);
    if (isNaN(parsedPeople) || parsedPeople < 1) {
      return NextResponse.json({ error: 'People needed must be at least 1.' }, { status: 400 });
    }

    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      return NextResponse.json({ error: 'Deadline must be a date and time in the future.' }, { status: 400 });
    }

    // Verify category is valid
    if (!Object.values(TaskCategory).includes(category as TaskCategory)) {
      return NextResponse.json({ error: `Invalid category. Choose from: ${Object.values(TaskCategory).join(', ')}` }, { status: 400 });
    }

    // Verify location is valid
    if (!Object.values(TaskLocation).includes(location as TaskLocation)) {
      return NextResponse.json({ error: `Invalid location. Choose from: ${Object.values(TaskLocation).join(', ')}` }, { status: 400 });
    }

    // Verify assignment mode is valid
    if (assignment_mode !== AssignmentMode.first_come && assignment_mode !== AssignmentMode.review_select) {
      return NextResponse.json({ error: 'Invalid assignment mode. Select first_come or review_select.' }, { status: 400 });
    }

    // Verify estimatedDuration is valid
    if (estimatedDuration && !Object.values(EstimatedDuration).includes(estimatedDuration as EstimatedDuration)) {
      return NextResponse.json({ error: `Invalid estimated duration. Choose from: ${Object.values(EstimatedDuration).join(', ')}` }, { status: 400 });
    }

    // 2. Academic Integrity Content Policy Checks
    const combinedContent = `${title} ${description}`.toLowerCase();
    const containsBlockedKeyword = ACADEMIC_BLOCKED_KEYWORDS.some(keyword => {
      // Check for whole words to avoid sub-word false positives
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(combinedContent);
    });

    if (containsBlockedKeyword) {
      return NextResponse.json({
        error: 'Task blocked. To maintain academic integrity, tasks involving writing assignments, taking exams, completing coursework, or academic impersonation are strictly prohibited on SideQuest. However, tutoring, educational explanations, and proofreading are fully allowed.',
        policyBlocked: true
      }, { status: 400 });
    }

    // 3. Create Task (No wallet/escrow deduction)
    const task = await prisma.task.create({
      data: {
        poster_id: sessionUser.id,
        title: title.trim(),
        description: description.trim(),
        photo_url: photo_url || null,
        category: category as TaskCategory,
        offeredAmount: parsedAmount,
        deadline: deadlineDate,
        location: location as TaskLocation,
        people_needed: parsedPeople,
        assignment_mode: assignment_mode,
        status: TaskStatus.OPEN,
        isUrgent: !!isUrgent,
        estimatedDuration: (estimatedDuration as EstimatedDuration) || EstimatedDuration.MIN_30,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Task created successfully!',
      task,
    });

  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

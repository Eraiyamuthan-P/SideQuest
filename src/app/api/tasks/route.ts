import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { TaskStatus, AssignmentMode } from '@prisma/client';

// Blocked keywords for academic dishonesty
const ACADEMIC_BLOCKED_KEYWORDS = [
  'exam', 'quiz', 'homework', 'assignment', 'essay', 'test',
  'impersonate', 'write paper', 'take class', 'do exam', 'grade',
  'midterm', 'endterm', 'cat1', 'cat2', 'fat'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parse filters
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const budgetMin = searchParams.get('budgetMin') ? parseFloat(searchParams.get('budgetMin')!) : undefined;
    const budgetMax = searchParams.get('budgetMax') ? parseFloat(searchParams.get('budgetMax')!) : undefined;
    const deadlineMin = searchParams.get('deadlineMin') ? new Date(searchParams.get('deadlineMin')!) : undefined;
    const deadlineMax = searchParams.get('deadlineMax') ? new Date(searchParams.get('deadlineMax')!) : undefined;
    const dateMin = searchParams.get('dateMin') ? new Date(searchParams.get('dateMin')!) : undefined;
    const dateMax = searchParams.get('dateMax') ? new Date(searchParams.get('dateMax')!) : undefined;
    
    // Status filter: default to open tasks, but allow fetching others
    const statusParam = searchParams.get('status');
    const status = statusParam ? (statusParam as TaskStatus) : TaskStatus.open;

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Build where clause
    const where: any = {
      status: status,
    };

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
      where.budget = {};
      if (budgetMin !== undefined) where.budget.gte = budgetMin;
      if (budgetMax !== undefined) where.budget.lte = budgetMax;
    }

    if (deadlineMin !== undefined || deadlineMax !== undefined) {
      where.deadline = {};
      if (deadlineMin !== undefined) where.deadline.gte = deadlineMin;
      if (deadlineMax !== undefined) where.deadline.lte = deadlineMax;
    }

    if (dateMin !== undefined || dateMax !== undefined) {
      where.created_at = {};
      if (dateMin !== undefined) where.created_at.gte = dateMin;
      if (dateMax !== undefined) where.created_at.lte = dateMax;
    }

    // Build orderBy clause
    let orderBy: any = { created_at: 'desc' };
    if (sortBy === 'budget_asc') {
      orderBy = { budget: 'asc' };
    } else if (sortBy === 'budget_desc') {
      orderBy = { budget: 'desc' };
    } else if (sortBy === 'oldest') {
      orderBy = { created_at: 'asc' };
    }

    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      include: {
        poster: {
          select: {
            username: true,
            verified: true,
          },
        },
        _count: {
          select: { applications: true },
        },
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

    const {
      title,
      description,
      photo_url,
      category,
      people_needed,
      budget,
      deadline,
      location,
      assignment_mode,
    } = await req.json();

    // 1. Basic Validations
    if (!title || !description || !category || !budget || !deadline || !location || !assignment_mode) {
      return NextResponse.json({ error: 'All fields (title, description, category, budget, deadline, location, assignment mode) are required.' }, { status: 400 });
    }

    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      return NextResponse.json({ error: 'Budget must be a positive number greater than 0.' }, { status: 400 });
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
    const allowedCategories = ['Errands', 'Second-hand items', 'Tutoring', 'Freelancing', 'Transportation'];
    if (!allowedCategories.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Choose from: ${allowedCategories.join(', ')}` }, { status: 400 });
    }

    // Verify assignment mode is valid
    if (assignment_mode !== AssignmentMode.first_come && assignment_mode !== AssignmentMode.review_select) {
      return NextResponse.json({ error: 'Invalid assignment mode. Select first_come or review_select.' }, { status: 400 });
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

    // 3. Check if user has enough credits to pay the budget
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { credits: true },
    });

    if (!user || user.credits < parsedBudget) {
      return NextResponse.json({
        error: `Insufficient credits. Your current balance is ${user?.credits || 0} credits, but this task requires a budget of ${parsedBudget} credits.`
      }, { status: 400 });
    }

    // 4. Create Task and Deduct credits from Poster (escrow)
    const task = await prisma.$transaction(async (tx) => {
      // Create Task
      const newTask = await tx.task.create({
        data: {
          poster_id: sessionUser.id,
          title: title.trim(),
          description: description.trim(),
          photo_url: photo_url || null,
          category,
          budget: parsedBudget,
          payment_amount: parsedBudget,
          deadline: deadlineDate,
          location: location.trim(),
          people_needed: parsedPeople,
          assignment_mode: assignment_mode,
          status: TaskStatus.open,
        },
      });

      // Deduct credits from user's account
      await tx.user.update({
        where: { id: sessionUser.id },
        data: { credits: { decrement: parsedBudget } },
      });

      // Log credit transaction
      await tx.creditTransaction.create({
        data: {
          user_id: sessionUser.id,
          amount: -parsedBudget,
          reason: `Posted task: "${title.trim()}" (Credits held in escrow)`,
        },
      });

      return newTask;
    });

    return NextResponse.json({
      success: true,
      message: 'Task created successfully! Credits have been locked in escrow.',
      task,
    });

  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

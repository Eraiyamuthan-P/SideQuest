import { PrismaClient, AssignmentMode, TaskStatus, ApplicationStatus, ReviewRole, SupportTicketType, TaskCategory, TaskLocation } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.supportTicket.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.taskApplication.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.verificationOtp.deleteMany({});
  await prisma.adminInvitation.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  
  const admin = await prisma.user.create({
    data: {
      username: 'vit_admin',
      email: 'admin@vit.ac.in',
      verified: true,
      role: 'ADMIN',
      credits: 100,
      bio: 'Official VIT Campus Task Administrator. Here to manage disputes and support tickets.',
      hostel_block: 'Main Office',
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      username: 'eraiyamuthan_p',
      email: 'eraiyamuthan.p2023@vitstudent.ac.in',
      verified: true,
      role: 'SUPER_ADMIN',
      credits: 500,
      bio: 'Platform Owner & Super Administrator',
      hostel_block: 'Main Office',
    },
  });

  const arjun = await prisma.user.create({
    data: {
      username: 'arjun_s',
      email: 'arjun.s@vitstudent.ac.in',
      verified: true,
      credits: 85,
      ratingAverage: 0,
      ratingCount: 0,
      bio: '3rd year B.Tech CSE. Good at Math tutoring and Java programming. Live in Block L.',
      hostel_block: 'L Block',
    },
  });

  const riya = await prisma.user.create({
    data: {
      username: 'riya_p',
      email: 'riya.patel2022@vitstudent.ac.in',
      verified: true,
      credits: 110,
      ratingAverage: 5.0,
      ratingCount: 1,
      bio: '2nd year Biotech student. Can run quick errands around campus. Live in Block D.',
      hostel_block: 'D Block',
    },
  });

  const neha = await prisma.user.create({
    data: {
      username: 'neha_s',
      email: 'neha.sharma@vitstudent.ac.in',
      verified: true,
      credits: 150,
      ratingAverage: 0,
      ratingCount: 0,
      bio: '4th year ECE. Happy to help with proofreading or second-hand items. Block G.',
      hostel_block: 'G Block',
    },
  });

  const vikram = await prisma.user.create({
    data: {
      username: 'vikram_r',
      email: 'vikram.rathore@vitstudent.ac.in',
      verified: true,
      credits: 65,
      ratingAverage: 5.0,
      ratingCount: 1,
      bio: 'Mechanical Eng student. Bike rider. Let me know if you need pick-up or drops from main gate.',
      hostel_block: 'Q Block',
    },
  });

  const karan = await prisma.user.create({
    data: {
      username: 'karan_m',
      email: 'karan.m@vitstudent.ac.in',
      verified: false,
      credits: 0,
      ratingAverage: 0,
      ratingCount: 0,
      bio: 'Freshman B.Tech IT. Unverified for now.',
      hostel_block: 'F Block',
    },
  });

  console.log('Seeding tasks...');

  // Task 1: Open, review_select
  const task1 = await prisma.task.create({
    data: {
      poster_id: arjun.id,
      title: 'Need hostel room cleaning',
      description: 'Need help deep cleaning my double-sharing room in L Block. Will supply cleaning liquids and vacuum cleaner.',
      category: TaskCategory.HOSTEL_HELP,
      offeredAmount: 150,
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
      location: TaskLocation.MENS_HOSTEL,
      people_needed: 1,
      assignment_mode: AssignmentMode.review_select,
      status: TaskStatus.OPEN,
    },
  });

  // Task 2: Open, first_come
  const task2 = await prisma.task.create({
    data: {
      poster_id: riya.id,
      title: 'Buy used engineering graphics drawing board',
      description: 'Looking for a standard drawing board in good condition for my EG course. Please attach photos if possible.',
      category: TaskCategory.SHOPPING,
      offeredAmount: 250,
      deadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      location: TaskLocation.WOMENS_HOSTEL,
      people_needed: 1,
      assignment_mode: AssignmentMode.first_come,
      status: TaskStatus.OPEN,
    },
  });

  // Task 3: Assigned/In Progress
  const task3 = await prisma.task.create({
    data: {
      poster_id: neha.id,
      title: 'Tutoring for Calculus-II before CAT-2 exam',
      description: 'Need someone to explain Double Integrals and Vector Calculus. We can sit in SJT study rooms.',
      category: TaskCategory.TUTORING,
      offeredAmount: 500,
      agreedAmount: 500,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: TaskLocation.SJT,
      people_needed: 1,
      assignment_mode: AssignmentMode.review_select,
      status: TaskStatus.ASSIGNED,
    },
  });

  // Task 4: Completed
  const task4 = await prisma.task.create({
    data: {
      poster_id: vikram.id,
      title: 'Snack delivery from Foodys at night',
      description: 'Can someone pick up a paneer roll and coke from Foodys and deliver it to Q Block gate? Buying cost separate, this budget is for delivery fee.',
      category: TaskCategory.FOOD_PICKUP,
      offeredAmount: 80,
      agreedAmount: 80,
      deadline: new Date(Date.now() - 4 * 60 * 60 * 1000), // completed in past
      location: TaskLocation.FOODYS,
      people_needed: 1,
      assignment_mode: AssignmentMode.first_come,
      status: TaskStatus.COMPLETED,
    },
  });

  // Task 5: Cancelled
  const task5 = await prisma.task.create({
    data: {
      poster_id: riya.id,
      title: 'Need a ride to Katpadi Railway Station',
      description: 'Have a train at 5:00 PM. Need someone to drop me on a scooter/bike. Will pay for petrol separately.',
      category: TaskCategory.RIDE_SHARING,
      offeredAmount: 120,
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
      location: TaskLocation.MAIN_GATE,
      people_needed: 1,
      assignment_mode: AssignmentMode.first_come,
      status: TaskStatus.CANCELLED,
    },
  });

  console.log('Seeding applications...');

  // Riya and Vikram apply for Arjun's Room Cleaning
  await prisma.taskApplication.create({
    data: {
      taskId: task1.id,
      doerId: riya.id,
      status: ApplicationStatus.PENDING,
      requestedAmount: 150,
      isCounterBid: false,
    },
  });

  await prisma.taskApplication.create({
    data: {
      taskId: task1.id,
      doerId: vikram.id,
      status: ApplicationStatus.PENDING,
      requestedAmount: 130,
      isCounterBid: true,
    },
  });

  // Arjun applied and was accepted for Neha's calculus tutoring
  await prisma.taskApplication.create({
    data: {
      taskId: task3.id,
      doerId: arjun.id,
      status: ApplicationStatus.ACCEPTED,
      requestedAmount: 500,
      isCounterBid: false,
    },
  });

  // Riya applied and was accepted/completed for Vikram's snack delivery
  await prisma.taskApplication.create({
    data: {
      taskId: task4.id,
      doerId: riya.id,
      status: ApplicationStatus.ACCEPTED,
      requestedAmount: 80,
      isCounterBid: false,
    },
  });

  console.log('Seeding reviews...');

  // Vikram reviewed Riya for snack delivery
  await prisma.review.create({
    data: {
      task_id: task4.id,
      reviewer_id: vikram.id,
      reviewee_id: riya.id,
      role: ReviewRole.poster,
      rating: 5,
      comment: 'Super fast delivery! The roll was still warm. Thanks Riya.',
    },
  });

  // Riya reviewed Vikram for snack delivery
  await prisma.review.create({
    data: {
      task_id: task4.id,
      reviewer_id: riya.id,
      reviewee_id: vikram.id,
      role: ReviewRole.doer,
      rating: 5,
      comment: 'Polite poster, paid promptly. 10/10 recommend!',
    },
  });

  console.log('Seeding badges...');
  await prisma.badge.create({
    data: {
      user_id: riya.id,
      badge_type: 'DOER_5_COMPLETED',
      earned_at: new Date(),
    },
  });

  console.log('Seeding messages...');
  // Chat messages between Neha and Arjun for tutoring
  await prisma.message.create({
    data: {
      task_id: task3.id,
      sender_id: neha.id,
      content: 'Hey Arjun! Thanks for accepting. Can we meet tomorrow at 4 PM?',
    },
  });

  await prisma.message.create({
    data: {
      task_id: task3.id,
      sender_id: arjun.id,
      content: 'Yes, 4 PM works! Let\'s meet at SJT 4th floor near the elevators.',
    },
  });

  console.log('Seeding support tickets...');
  // A sample dispute ticket
  await prisma.supportTicket.create({
    data: {
      user_id: arjun.id,
      type: SupportTicketType.dispute,
      subject: 'Dispute: Room cleaning payment issue',
      message: 'The room cleaner left early and did not sweep under the bed as promised. Need partial refund.',
      status: 'open',
    },
  });

  // A feedback ticket
  await prisma.supportTicket.create({
    data: {
      user_id: riya.id,
      type: SupportTicketType.feedback,
      subject: 'Great application experience!',
      message: 'Love the OTP system and fast layout. Hope to see dark mode soon!',
      status: 'resolved',
    },
  });

  console.log('Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

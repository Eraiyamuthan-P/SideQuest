import { PrismaClient, AssignmentMode, TaskStatus, ApplicationStatus, ReviewRole, SupportTicketType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.supportTicket.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.taskApplication.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.verificationOtp.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  
  const admin = await prisma.user.create({
    data: {
      username: 'vit_admin',
      email: 'admin@vit.ac.in',
      verified: true,
      balance: 500,
      bio: 'Official VIT Campus Task Administrator. Here to manage disputes and support tickets.',
      hostel_block: 'Main Office',
    },
  });

  const arjun = await prisma.user.create({
    data: {
      username: 'arjun_s',
      email: 'arjun.s@vitstudent.ac.in',
      verified: true,
      balance: 150,
      bio: '3rd year B.Tech CSE. Good at Math tutoring and Java programming. Live in Block L.',
      hostel_block: 'L Block',
    },
  });

  const riya = await prisma.user.create({
    data: {
      username: 'riya_p',
      email: 'riya.patel2022@vitstudent.ac.in',
      verified: true,
      balance: 90,
      bio: '2nd year Biotech student. Can run quick errands around campus. Live in Block D.',
      hostel_block: 'D Block',
    },
  });

  const neha = await prisma.user.create({
    data: {
      username: 'neha_s',
      email: 'neha.sharma@vitstudent.ac.in',
      verified: true,
      balance: 120,
      bio: '4th year ECE. Happy to help with proofreading or second-hand items. Block G.',
      hostel_block: 'G Block',
    },
  });

  const vikram = await prisma.user.create({
    data: {
      username: 'vikram_r',
      email: 'vikram.rathore@vitstudent.ac.in',
      verified: true,
      balance: 80,
      bio: 'Mechanical Eng student. Bike rider. Let me know if you need pick-up or drops from main gate.',
      hostel_block: 'Q Block',
    },
  });

  const karan = await prisma.user.create({
    data: {
      username: 'karan_m',
      email: 'karan.m@vitstudent.ac.in',
      verified: false,
      balance: 100,
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
      category: 'Errands',
      budget: 150.0,
      payment_amount: 150.0,
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days from now
      location: 'L Block, Room 405',
      people_needed: 1,
      assignment_mode: AssignmentMode.review_select,
      status: TaskStatus.open,
    },
  });

  // Task 2: Open, first_come
  const task2 = await prisma.task.create({
    data: {
      poster_id: riya.id,
      title: 'Buy used engineering graphics drawing board',
      description: 'Looking for a standard drawing board in good condition for my EG course. Please attach photos if possible.',
      category: 'Second-hand items',
      budget: 250.0,
      payment_amount: 250.0,
      deadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      location: 'D Block Lobby',
      people_needed: 1,
      assignment_mode: AssignmentMode.first_come,
      status: TaskStatus.open,
    },
  });

  // Task 3: Assigned/In Progress
  const task3 = await prisma.task.create({
    data: {
      poster_id: neha.id,
      title: 'Tutoring for Calculus-II before CAT-2 exam',
      description: 'Need someone to explain Double Integrals and Vector Calculus. We can sit in SJT study rooms.',
      category: 'Tutoring',
      budget: 500.0,
      payment_amount: 500.0,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      location: 'SJT 4th Floor Study Room',
      people_needed: 1,
      assignment_mode: AssignmentMode.review_select,
      status: TaskStatus.assigned,
    },
  });

  // Task 4: Completed
  const task4 = await prisma.task.create({
    data: {
      poster_id: vikram.id,
      title: 'Snack delivery from Foodys at night',
      description: 'Can someone pick up a paneer roll and coke from Foodys and deliver it to Q Block gate? Buying cost separate, this budget is for delivery fee.',
      category: 'Errands',
      budget: 80.0,
      payment_amount: 80.0,
      deadline: new Date(Date.now() - 4 * 60 * 60 * 1000), // completed in past
      location: 'Q Block Gate',
      people_needed: 1,
      assignment_mode: AssignmentMode.first_come,
      status: TaskStatus.completed,
    },
  });

  // Task 5: Cancelled
  const task5 = await prisma.task.create({
    data: {
      poster_id: riya.id,
      title: 'Need a ride to Katpadi Railway Station',
      description: 'Have a train at 5:00 PM. Need someone to drop me on a scooter/bike. Will pay for petrol separately.',
      category: 'Transportation',
      budget: 120.0,
      payment_amount: 120.0,
      deadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
      location: 'Main Gate VIT',
      people_needed: 1,
      assignment_mode: AssignmentMode.first_come,
      status: TaskStatus.cancelled,
    },
  });

  console.log('Seeding applications...');

  // Riya and Vikram apply for Arjun's Room Cleaning
  await prisma.taskApplication.create({
    data: {
      task_id: task1.id,
      applicant_id: riya.id,
      status: ApplicationStatus.pending,
      offer_amount: 150.0,
    },
  });

  await prisma.taskApplication.create({
    data: {
      task_id: task1.id,
      applicant_id: vikram.id,
      status: ApplicationStatus.pending,
      offer_amount: 130.0, // custom lower offer
    },
  });

  // Arjun applied and was accepted for Neha's calculus tutoring
  await prisma.taskApplication.create({
    data: {
      task_id: task3.id,
      applicant_id: arjun.id,
      status: ApplicationStatus.accepted,
      offer_amount: 500.0,
    },
  });

  // Riya applied and was accepted/completed for Vikram's snack delivery
  await prisma.taskApplication.create({
    data: {
      task_id: task4.id,
      applicant_id: riya.id,
      status: ApplicationStatus.accepted,
      offer_amount: 80.0,
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

  console.log('Seeding credit transactions...');
  // Let\'s record some transactions for Riya and Vikram
  await prisma.transaction.create({
    data: {
      user_id: riya.id,
      amount: 10,
      reason: 'Earned: Snack delivery from Foodys (task payment)',
    },
  });

  await prisma.transaction.create({
    data: {
      user_id: vikram.id,
      amount: 5,
      reason: 'Completion bonus: Snack delivery from Foodys (Poster)',
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

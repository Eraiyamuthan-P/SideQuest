import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  let dbStatus = 'Disconnected';
  let dbLatency = 0;

  try {
    // Run simple query to check database connection and calculate roundtrip latency
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'Connected';
    dbLatency = Date.now() - start;
  } catch (error) {
    console.error('Status diagnostics DB error:', error);
  }

  return NextResponse.json({
    success: true,
    status: {
      server: 'Online',
      database: dbStatus,
      databaseLatencyMs: dbLatency,
      api: 'Healthy',
      auth: 'Healthy',
      notifications: 'Healthy',
      version: '1.0.0',
      uptimeSec: Math.floor(process.uptime()),
    }
  });
}

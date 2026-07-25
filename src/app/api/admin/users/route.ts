import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { AccountStatus, Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null // Only display active (non-deleted) users in users management directory
      },
      select: {
        id: true,
        username: true,
        email: true,
        verified: true,
        credits: true,
        role: true,
        ratingAverage: true,
        ratingCount: true,
        status: true,
        created_at: true,
      },
      orderBy: { username: 'asc' }
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error('Admin users query error:', error);
    return NextResponse.json({ error: 'Failed to retrieve users.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const { targetUserId, action, reason, desiredRole } = await req.json();
    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    // Reason validation checks (10-500 chars) for suspension, ban, restore, delete, role change
    const actionRequiresReason = ['ADJUST_ROLE', 'SUSPEND_USER', 'BAN_USER', 'RESTORE_USER', 'DELETE_USER'].includes(action);
    if (actionRequiresReason) {
      if (!reason || typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
        return NextResponse.json({ error: 'Administrative reason must be between 10 and 500 characters long.' }, { status: 400 });
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Security check: MODERATOR & ADMIN cannot edit ADMIN or SUPER_ADMIN accounts
    if (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden. Only Super Admins can modify Admin or Super Admin accounts.' }, { status: 403 });
      }
    }

    let updatedUser;
    let previousVal = '';
    let newVal = '';
    let metadataObj: any = {};
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

    if (action === 'TOGGLE_VERIFY') {
      // MODERATOR can toggle verify on standard students
      if (user.role === 'MODERATOR' && targetUser.role !== 'STUDENT') {
        return NextResponse.json({ error: 'Forbidden. Moderators can only verify standard student accounts.' }, { status: 403 });
      }

      previousVal = targetUser.verified ? 'Verified' : 'Unverified';
      newVal = targetUser.verified ? 'Unverified' : 'Verified';
      metadataObj = { oldVerified: targetUser.verified, newVerified: !targetUser.verified };

      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { verified: !targetUser.verified }
      });
    } else if (action === 'ADJUST_ROLE') {
      if (!desiredRole) {
        return NextResponse.json({ error: 'Desired role is required for role adjustment.' }, { status: 400 });
      }

      // MODERATOR cannot edit roles
      if (user.role === 'MODERATOR') {
        return NextResponse.json({ error: 'Forbidden. Moderators cannot modify roles.' }, { status: 403 });
      }

      // Prevent removing the last SUPER_ADMIN
      if (targetUser.role === 'SUPER_ADMIN' && desiredRole !== 'SUPER_ADMIN') {
        const superAdminCount = await prisma.user.count({
          where: { role: 'SUPER_ADMIN' }
        });
        if (superAdminCount <= 1) {
          return NextResponse.json({ error: 'Operation rejected. Cannot demote or remove the last remaining Super Admin.' }, { status: 400 });
        }
      }

      // ADMIN restrictions
      if (user.role === 'ADMIN') {
        const isValidAdminTransition =
          (targetUser.role === 'STUDENT' && desiredRole === 'MODERATOR') ||
          (targetUser.role === 'MODERATOR' && desiredRole === 'STUDENT');

        if (!isValidAdminTransition) {
          return NextResponse.json({ error: 'Forbidden. Admins can only promote Students to Moderators or demote Moderators to Students.' }, { status: 403 });
        }
      }

      previousVal = targetUser.role;
      newVal = desiredRole;
      metadataObj = { oldRole: targetUser.role, newRole: desiredRole };

      // Increment sessionVersion on role change to invalidate current sessions
      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { 
          role: desiredRole as Role,
          sessionVersion: { increment: 1 }
        }
      });
    } else if (action === 'SUSPEND_USER') {
      if (user.role === 'MODERATOR') {
        return NextResponse.json({ error: 'Forbidden. Moderators cannot suspend users.' }, { status: 403 });
      }

      previousVal = targetUser.status;
      newVal = 'SUSPENDED';
      metadataObj = { oldStatus: targetUser.status, newStatus: 'SUSPENDED' };

      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          status: AccountStatus.SUSPENDED,
          sessionVersion: { increment: 1 }
        }
      });
    } else if (action === 'BAN_USER') {
      if (user.role === 'MODERATOR') {
        return NextResponse.json({ error: 'Forbidden. Moderators cannot ban users.' }, { status: 403 });
      }

      previousVal = targetUser.status;
      newVal = 'BANNED';
      metadataObj = { oldStatus: targetUser.status, newStatus: 'BANNED' };

      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          status: AccountStatus.BANNED,
          sessionVersion: { increment: 1 }
        }
      });
    } else if (action === 'RESTORE_USER') {
      if (user.role === 'MODERATOR') {
        return NextResponse.json({ error: 'Forbidden. Moderators cannot restore users.' }, { status: 403 });
      }

      previousVal = targetUser.status;
      newVal = 'ACTIVE';
      metadataObj = { oldStatus: targetUser.status, newStatus: 'ACTIVE', restoredFromSoftDelete: targetUser.deletedAt !== null };

      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          status: AccountStatus.ACTIVE,
          deletedAt: null,
          sessionVersion: { increment: 1 }
        }
      });
    } else if (action === 'DELETE_USER') {
      if (user.role === 'MODERATOR') {
        return NextResponse.json({ error: 'Forbidden. Moderators cannot delete users.' }, { status: 403 });
      }

      // Check last super admin lockout
      if (targetUser.role === 'SUPER_ADMIN') {
        const superAdminCount = await prisma.user.count({
          where: { role: 'SUPER_ADMIN' }
        });
        if (superAdminCount <= 1) {
          return NextResponse.json({ error: 'Operation rejected. Cannot delete the last remaining Super Admin.' }, { status: 400 });
        }
      }

      previousVal = targetUser.deletedAt ? 'Soft-deleted' : 'Active';
      newVal = 'Soft-deleted';
      metadataObj = { softDeleted: true, statusBeforeDelete: targetUser.status };

      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          deletedAt: new Date(),
          sessionVersion: { increment: 1 }
        }
      });
    } else {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        targetId: targetUser.id,
        targetEmail: targetUser.email,
        action: action === 'ADJUST_ROLE' ? 'ROLE_UPDATED' : action === 'TOGGLE_VERIFY' ? 'USER_TOGGLE_VERIFY' : `USER_${action}`,
        reason: reason || 'Administrative override',
        metadata: metadataObj,
        ipAddress: ipAddress,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Admin user post error:', error);
    return NextResponse.json({ error: 'Failed to update user.' }, { status: 500 });
  }
}

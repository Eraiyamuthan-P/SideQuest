import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'ADMIN' && sessionUser.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const isPowerAdmin = sessionUser.role === 'SUPER_ADMIN' || sessionUser.role === 'ADMIN';

    // 1. Fetch active administrators (users with non-STUDENT roles, not soft-deleted)
    const activeAdmins = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] },
        deletedAt: null
      },
      select: {
        id: true,
        username: true,
        email: isPowerAdmin,
        role: true,
        created_at: true,
      },
      orderBy: { role: 'asc' }
    });

    // 2. Fetch pending invitations
    const pendingInvites = await prisma.adminInvitation.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Map into unified list
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const list = [
      ...activeAdmins.map(admin => ({
        id: admin.id,
        type: 'user',
        username: admin.username,
        email: isPowerAdmin ? admin.email : undefined,
        role: admin.role,
        status: 'Active',
        createdOn: admin.created_at,
        createdBy: admin.role === 'SUPER_ADMIN' ? 'Platform Initialization' : 'Administrator Override',
        daysRemaining: null,
      })),
      ...pendingInvites.map(invite => {
        const elapsed = now - new Date(invite.createdAt).getTime();
        const isExpired = elapsed > thirtyDaysMs;
        const daysRemaining = Math.max(0, Math.ceil((thirtyDaysMs - elapsed) / (24 * 60 * 60 * 1000)));
        return {
          id: invite.id,
          type: 'invitation',
          username: '(Pending Registration)',
          email: isPowerAdmin ? invite.email : undefined,
          role: invite.role,
          status: isExpired ? 'Expired' : 'Pending',
          createdOn: invite.createdAt,
          createdBy: invite.invitedBy,
          daysRemaining: isExpired ? 0 : daysRemaining,
        };
      })
    ];

    return NextResponse.json({ success: true, administrators: list });

  } catch (error: any) {
    console.error('Error fetching administrators:', error);
    return NextResponse.json({ error: 'Failed to retrieve administrators.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { email, role, action, reason } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const lowerEmail = email.toLowerCase().trim();
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. Action: Resend Pending Invitation
    if (action === 'RESEND') {
      const invite = await prisma.adminInvitation.findUnique({
        where: { email: lowerEmail }
      });
      if (!invite) {
        return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
      }

      // Hierarchy security
      if (invite.role === 'ADMIN' || invite.role === 'SUPER_ADMIN') {
        if (sessionUser.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden. Only Super Admins can manage Admin or Super Admin invitations.' }, { status: 403 });
        }
      }

      const updatedInvite = await prisma.adminInvitation.update({
        where: { email: lowerEmail },
        data: { createdAt: new Date(), invitedBy: sessionUser.email }
      });

      await prisma.auditLog.create({
        data: {
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          targetId: invite.id,
          targetEmail: lowerEmail,
          action: 'INVITATION_RESENT',
          reason: 'Resending pending admin invitation',
          metadata: { oldCreatedAt: invite.createdAt, newCreatedAt: updatedInvite.createdAt },
          ipAddress,
        }
      });

      return NextResponse.json({ success: true, message: `Invitation for ${lowerEmail} resent successfully.` });
    }

    // 2. Action: Change Pending Invitation Role or Create/Modify role
    if (!role) {
      return NextResponse.json({ error: 'Role is required.' }, { status: 400 });
    }

    // Enforce mandatory administrative reason (10-500 chars) for role changes
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 500) {
      return NextResponse.json({ error: 'Administrative reason must be between 10 and 500 characters long.' }, { status: 400 });
    }

    // Hierarchy validation: only SUPER_ADMIN can assign/upgrade to ADMIN or SUPER_ADMIN
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      if (sessionUser.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden. Only Super Admins can assign Admin or Super Admin privileges.' }, { status: 403 });
      }
    }

    if (action === 'CHANGE_ROLE') {
      const invite = await prisma.adminInvitation.findUnique({
        where: { email: lowerEmail }
      });
      if (!invite) {
        return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
      }

      // Security check
      if (invite.role === 'ADMIN' || invite.role === 'SUPER_ADMIN') {
        if (sessionUser.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden. Only Super Admins can modify Admin or Super Admin invitations.' }, { status: 403 });
        }
      }

      const updatedInvite = await prisma.adminInvitation.update({
        where: { email: lowerEmail },
        data: { role: role as Role }
      });

      await prisma.auditLog.create({
        data: {
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          targetId: invite.id,
          targetEmail: lowerEmail,
          action: 'INVITATION_ROLE_CHANGED',
          reason: reason.trim(),
          metadata: { oldRole: invite.role, newRole: role },
          ipAddress,
        }
      });

      return NextResponse.json({ success: true, message: `Updated invitation role for ${lowerEmail} to ${role}.` });
    }

    // 3. Action: Invite/Promote Co-Admin (Existing User check)
    const existingUser = await prisma.user.findUnique({
      where: { email: lowerEmail }
    });

    if (existingUser) {
      if (existingUser.role === 'ADMIN' || existingUser.role === 'SUPER_ADMIN') {
        if (sessionUser.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden. Only Super Admins can modify Admin or Super Admin accounts.' }, { status: 403 });
        }
      }

      const oldRole = existingUser.role;
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { 
          role: role as Role,
          sessionVersion: { increment: 1 } // Revoke sessions immediately
        }
      });

      await prisma.auditLog.create({
        data: {
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          targetId: existingUser.id,
          targetEmail: lowerEmail,
          action: 'ROLE_UPDATED',
          reason: reason.trim(),
          metadata: { oldRole, newRole: role },
          ipAddress,
        }
      });

      return NextResponse.json({ success: true, message: `Successfully updated ${lowerEmail} role to ${role}.`, user: updatedUser });
    } else {
      // Create pending invitation
      const invitation = await prisma.adminInvitation.upsert({
        where: { email: lowerEmail },
        update: {
          role: role as Role,
          invitedBy: sessionUser.email,
          createdAt: new Date(), // Reset expiry
        },
        create: {
          email: lowerEmail,
          role: role as Role,
          invitedBy: sessionUser.email,
        }
      });

      await prisma.auditLog.create({
        data: {
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          targetId: invitation.id,
          targetEmail: lowerEmail,
          action: 'INVITATION_CREATED',
          reason: reason.trim(),
          metadata: { oldRole: 'NONE', newRole: role },
          ipAddress,
        }
      });

      return NextResponse.json({ success: true, message: `Successfully invited ${lowerEmail} as ${role}.`, invitation });
    }

  } catch (error: any) {
    console.error('Error inviting administrator:', error);
    return NextResponse.json({ error: 'Failed to invite administrator.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden. Admin credentials required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('id');
    const type = searchParams.get('type'); // "user" | "invitation"
    const reason = searchParams.get('reason') || '';

    if (!targetId || !type) {
      return NextResponse.json({ error: 'Missing parameters.' }, { status: 400 });
    }

    // Role updates/demotions require mandatory reasons
    if (!reason || reason.trim().length < 10 || reason.trim().length > 500) {
      return NextResponse.json({ error: 'Administrative reason must be between 10 and 500 characters long.' }, { status: 400 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

    if (type === 'user') {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetId }
      });

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      // Security Check: Prevents self-demotion or removal of the last SUPER_ADMIN
      if (targetUser.role === 'SUPER_ADMIN') {
        const superAdminCount = await prisma.user.count({
          where: { role: 'SUPER_ADMIN' }
        });
        if (superAdminCount <= 1) {
          return NextResponse.json({ error: 'Operation rejected. Cannot demote or remove the last remaining Super Admin.' }, { status: 400 });
        }
      }

      // Only SUPER_ADMIN can demote an ADMIN or SUPER_ADMIN
      if (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') {
        if (sessionUser.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden. Only Super Admins can demote Admins or Super Admins.' }, { status: 403 });
        }
      }

      // Demote to STUDENT
      const updatedUser = await prisma.user.update({
        where: { id: targetId },
        data: { 
          role: 'STUDENT',
          sessionVersion: { increment: 1 } // Force logout
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          targetId: targetUser.id,
          targetEmail: targetUser.email,
          action: 'ROLE_UPDATED',
          reason: reason.trim(),
          metadata: { oldRole: targetUser.role, newRole: 'STUDENT' },
          ipAddress,
        }
      });

      return NextResponse.json({ success: true, message: `Successfully demoted ${targetUser.email} to STUDENT.`, user: updatedUser });

    } else if (type === 'invitation') {
      const invitation = await prisma.adminInvitation.findUnique({
        where: { id: targetId }
      });

      if (!invitation) {
        return NextResponse.json({ error: 'Invitation not found.' }, { status: 404 });
      }

      // Security check
      if (invitation.role === 'ADMIN' || invitation.role === 'SUPER_ADMIN') {
        if (sessionUser.role !== 'SUPER_ADMIN') {
          return NextResponse.json({ error: 'Forbidden. Only Super Admins can revoke Admin or Super Admin invitations.' }, { status: 403 });
        }
      }

      // Delete invitation
      await prisma.adminInvitation.delete({
        where: { id: targetId }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          actorId: sessionUser.id,
          actorEmail: sessionUser.email,
          targetId: invitation.id,
          targetEmail: invitation.email,
          action: 'INVITATION_CANCELLED',
          reason: reason.trim(),
          metadata: { oldRole: invitation.role, newRole: 'NONE' },
          ipAddress,
        }
      });

      return NextResponse.json({ success: true, message: `Revoked pending invitation for ${invitation.email}.` });
    } else {
      return NextResponse.json({ error: 'Invalid type parameters.' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error deleting administrator relation:', error);
    return NextResponse.json({ error: 'Failed to revoke administrator permissions.' }, { status: 500 });
  }
}

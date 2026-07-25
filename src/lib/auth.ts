import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import prisma from './prisma';
import { Role, AccountStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  verified: boolean;
  ratingAverage: number;
  ratingCount: number;
  role: Role;
  status: AccountStatus;
  sessionVersion: number;
}

export async function getSessionUser(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        verified: true,
        ratingAverage: true,
        ratingCount: true,
        role: true,
        status: true,
        deletedAt: true,
        sessionVersion: true,
      },
    });

    if (!user) {
      return null;
    }

    // BANNED or Soft Deleted users: reject login/JWT completely
    if (user.deletedAt !== null || user.status === AccountStatus.BANNED) {
      return null;
    }

    // Session Revocation: if JWT sessionVersion differs from database sessionVersion, reject token
    if (user.sessionVersion !== payload.sessionVersion) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      verified: user.verified,
      ratingAverage: user.ratingAverage,
      ratingCount: user.ratingCount,
      role: user.role,
      status: user.status,
      sessionVersion: user.sessionVersion,
    };
  } catch (error) {
    console.error('Error fetching session user:', error);
    return null;
  }
}

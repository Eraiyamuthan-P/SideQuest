import { cookies } from 'next/headers';
import { verifyToken } from './jwt';
import prisma from './prisma';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  verified: boolean;
  balance: number;
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
        balance: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Error fetching session user:', error);
    return null;
  }
}

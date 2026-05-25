import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const user = db
      .prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?')
      .get(authUser.uid) as any;

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return errorResponse('Internal server error', 500);
  }
}

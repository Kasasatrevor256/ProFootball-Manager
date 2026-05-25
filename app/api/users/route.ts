import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search');

    const total = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;

    const rows = db
      .prepare(
        'SELECT id, name, email, role, status, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
      )
      .all(limit, skip) as any[];

    let users = rows.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
      );
    }

    return successResponse({ data: users, total, skip, limit });
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse('Internal server error', 500);
  }
}

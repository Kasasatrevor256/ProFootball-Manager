import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { UpdateUserRequest, UserRole } from '@/lib/types';
import bcrypt from 'bcryptjs';

type UpdateUserBody = UpdateUserRequest & { password?: string };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    if (!authUser) {
      return unauthorizedResponse();
    }

    const user = db
      .prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?')
      .get(id) as any;

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
    console.error('Get user error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    if (!authUser) {
      return unauthorizedResponse();
    }

    // Get current user's role
    const currentUser = db
      .prepare('SELECT role FROM users WHERE id = ?')
      .get(authUser.uid) as any;

    // Users can only update their own profile unless they're admin
    if (authUser.uid !== id && currentUser?.role !== UserRole.ADMIN) {
      return forbiddenResponse('Not enough permissions');
    }

    const body: UpdateUserBody = await request.json();

    // Check user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(id) as any;
    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    // Build dynamic SET clause
    const setClauses: string[] = [];
    const values: any[] = [];

    if (body.name) { setClauses.push('name = ?'); values.push(body.name); }
    if (body.email) { setClauses.push('email = ?'); values.push(body.email); }
    if (body.role) { setClauses.push('role = ?'); values.push(body.role); }
    if (body.status) { setClauses.push('status = ?'); values.push(body.status); }
    if (body.password) {
      const passwordHash = await bcrypt.hash(body.password, 10);
      setClauses.push('password_hash = ?');
      values.push(passwordHash);
    }

    const now = new Date().toISOString();
    setClauses.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updatedUser = db
      .prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?')
      .get(id) as any;

    return successResponse({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    if (!authUser) {
      return unauthorizedResponse();
    }

    const currentUser = db.prepare('SELECT role FROM users WHERE id = ?').get(authUser.uid) as any;

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return forbiddenResponse('Admin access required');
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse('Internal server error', 500);
  }
}

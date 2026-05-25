import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, forbiddenResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreateUserRequest, UserRole, UserStatus } from '@/lib/types';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const currentUser = db.prepare('SELECT role FROM users WHERE id = ?').get(authUser.uid) as any;

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return forbiddenResponse('Admin access required');
    }

    const body: CreateUserRequest = await request.json();
    const { name, email, role, password } = body;

    if (!name || !email || !role || !password) {
      return errorResponse('All fields are required', 400);
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (existingUser) {
      return errorResponse('User with this email already exists', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO users (id, name, email, role, status, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, email, role, UserStatus.ACTIVE, passwordHash, now, now);

    const newUser = db
      .prepare('SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE id = ?')
      .get(id) as any;

    return successResponse({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('Internal server error', 500);
  }
}

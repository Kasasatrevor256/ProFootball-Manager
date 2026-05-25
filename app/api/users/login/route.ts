import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/auth-utils';
import { LoginRequest, UserStatus } from '@/lib/types';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }

    const userData = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!userData) {
      return errorResponse('Invalid credentials', 401);
    }

    const isValidPassword = await bcrypt.compare(password, userData.password_hash || '');
    if (!isValidPassword) {
      return errorResponse('Invalid credentials', 401);
    }

    if (userData.status !== UserStatus.ACTIVE) {
      return errorResponse('User account is not active', 401);
    }

    const token = Buffer.from(
      JSON.stringify({
        userId: userData.id,
        email: userData.email,
        role: userData.role,
      })
    ).toString('base64');

    return successResponse({
      message: 'Login successful',
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: userData.status,
        createdAt: userData.created_at,
        updatedAt: userData.updated_at,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Internal server error', 500);
  }
}

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { successResponse, errorResponse } from '@/lib/auth-utils';
import { LoginRequest, UserStatus } from '@/lib/types';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }

    // Get user from Supabase
    const { data: users, error: queryError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (queryError || !users || users.length === 0) {
      return errorResponse('Invalid credentials', 401);
    }

    const userData = users[0];

    // Verify password using bcrypt
    // PostgreSQL crypt() with 'bf' should produce bcrypt-compatible hash
    const isValidPassword = await bcrypt.compare(password, userData.password_hash || '');
    if (!isValidPassword) {
      return errorResponse('Invalid credentials', 401);
    }

    // Check user status
    if (userData.status !== UserStatus.ACTIVE) {
      return errorResponse('User account is not active', 401);
    }

    // Return user data without password hash
    const { password_hash, ...userWithoutPassword } = userData;

    // Create a simple token (user ID encoded in base64)
    // In production, consider using proper JWT tokens
    const token = Buffer.from(JSON.stringify({ 
      userId: userData.id,
      email: userData.email,
      role: userData.role 
    })).toString('base64');

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
      token: token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Internal server error', 500);
  }
}

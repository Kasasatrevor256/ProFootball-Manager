import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, unauthorizedResponse, forbiddenResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreateUserRequest, UserRole, UserStatus } from '@/lib/types';
import bcrypt from 'bcrypt';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    // Get user role from Supabase
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authUser.uid)
      .single();

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return forbiddenResponse('Admin access required');
    }

    const body: CreateUserRequest = await request.json();
    const { name, email, role, password } = body;

    if (!name || !email || !role || !password) {
      return errorResponse('All fields are required', 400);
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single();

    if (existingUser) {
      return errorResponse('User with this email already exists', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in Supabase
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email,
        role,
        status: UserStatus.ACTIVE,
        password_hash: passwordHash,
      })
      .select('id, name, email, role, status, created_at, updated_at')
      .single();

    if (error) {
      console.error('Create user error:', error);
      return errorResponse('Failed to create user', 500);
    }

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

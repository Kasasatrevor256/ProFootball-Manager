import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
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

    let query = supabaseAdmin
      .from('users')
      .select('id, name, email, role, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);

    const { data: users, error } = await query;

    if (error) {
      console.error('Get users error:', error);
      return errorResponse('Failed to fetch users', 500);
    }

    let filteredUsers = (users || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    return successResponse(filteredUsers);
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse('Internal server error', 500);
  }
}

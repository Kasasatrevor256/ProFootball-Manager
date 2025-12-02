import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, unauthorizedResponse, forbiddenResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { UpdateUserRequest, UserRole } from '@/lib/types';
import bcrypt from 'bcrypt';

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

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, status, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !user) {
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
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authUser.uid)
      .single();

    // Users can only update their own profile unless they're admin
    if (authUser.uid !== id && currentUser?.role !== UserRole.ADMIN) {
      return forbiddenResponse('Not enough permissions');
    }

    const body: UpdateUserRequest = await request.json();

    // Get existing user
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return errorResponse('User not found', 404);
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.role) updateData.role = body.role;
    if (body.status) updateData.status = body.status;
    if (body.password) {
      updateData.password_hash = await bcrypt.hash(body.password, 10);
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, role, status, created_at, updated_at')
      .single();

    if (error) {
      console.error('Update user error:', error);
      return errorResponse('Failed to update user', 500);
    }

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

    // Check if admin
    const { data: currentUser } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authUser.uid)
      .single();

    if (!currentUser || currentUser.role !== UserRole.ADMIN) {
      return forbiddenResponse('Admin access required');
    }

    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete user error:', error);
      return errorResponse('Failed to delete user', 500);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse('Internal server error', 500);
  }
}

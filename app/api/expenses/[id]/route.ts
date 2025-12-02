import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { UpdateExpenseRequest } from '@/lib/types';

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

    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !expense) {
      return errorResponse('Expense not found', 404);
    }

    return successResponse({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: parseFloat(expense.amount.toString()),
      expenseDate: expense.expense_date,
      matchDayId: expense.match_day_id,
      createdBy: expense.created_by,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
    });
  } catch (error) {
    console.error('Get expense error:', error);
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

    const body: UpdateExpenseRequest = await request.json();

    const { data: existingExpense } = await supabaseAdmin
      .from('expenses')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingExpense) {
      return errorResponse('Expense not found', 404);
    }

    const updateData: any = {};
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.expenseDate !== undefined) updateData.expense_date = body.expenseDate;
    if (body.matchDayId !== undefined) updateData.match_day_id = body.matchDayId;

    const { data: updatedExpense, error } = await supabaseAdmin
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update expense error:', error);
      return errorResponse('Failed to update expense', 500);
    }

    return successResponse({
      id: updatedExpense.id,
      description: updatedExpense.description,
      category: updatedExpense.category,
      amount: parseFloat(updatedExpense.amount.toString()),
      expenseDate: updatedExpense.expense_date,
      matchDayId: updatedExpense.match_day_id,
      createdBy: updatedExpense.created_by,
      createdAt: updatedExpense.created_at,
      updatedAt: updatedExpense.updated_at,
    });
  } catch (error) {
    console.error('Update expense error:', error);
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

    const { error } = await supabaseAdmin
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete expense error:', error);
      return errorResponse('Failed to delete expense', 500);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete expense error:', error);
    return errorResponse('Internal server error', 500);
  }
}

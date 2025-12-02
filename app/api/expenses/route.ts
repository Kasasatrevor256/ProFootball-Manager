import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreateExpenseRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body: CreateExpenseRequest = await request.json();
    const { description, category, amount, expenseDate, matchDayId } = body;

    if (!description || !category || !amount) {
      return errorResponse('Description, category, and amount are required', 400);
    }

    const { data: expense, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        description,
        category,
        amount,
        expense_date: expenseDate || new Date().toISOString().split('T')[0],
        match_day_id: matchDayId || null,
        created_by: authUser.uid,
      })
      .select()
      .single();

    if (error) {
      console.error('Create expense error:', error);
      return errorResponse('Failed to create expense', 500);
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
    }, 201);
  } catch (error) {
    console.error('Create expense error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '100');
    const category = searchParams.get('category');
    const matchDayId = searchParams.get('match_day_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabaseAdmin
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .range(skip, skip + limit - 1);

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    if (matchDayId) {
      query = query.eq('match_day_id', matchDayId);
    }
    if (startDate) {
      query = query.gte('expense_date', startDate);
    }
    if (endDate) {
      query = query.lte('expense_date', endDate);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error('Get expenses error:', error);
      return errorResponse('Failed to fetch expenses', 500);
    }

    const mappedExpenses = (expenses || []).map((expense: any) => ({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: parseFloat(expense.amount.toString()),
      expenseDate: expense.expense_date,
      matchDayId: expense.match_day_id,
      createdBy: expense.created_by,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
    }));

    return successResponse(mappedExpenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    return errorResponse('Internal server error', 500);
  }
}

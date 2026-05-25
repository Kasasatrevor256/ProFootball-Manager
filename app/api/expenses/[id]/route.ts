import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
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

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as any;

    if (!expense) {
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

    const existingExpense = db.prepare('SELECT id FROM expenses WHERE id = ?').get(id) as any;
    if (!existingExpense) {
      return errorResponse('Expense not found', 404);
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    if (body.description !== undefined) { setClauses.push('description = ?'); values.push(body.description); }
    if (body.category !== undefined) { setClauses.push('category = ?'); values.push(body.category); }
    if (body.amount !== undefined) { setClauses.push('amount = ?'); values.push(body.amount); }
    if (body.expenseDate !== undefined) {
      const d = typeof body.expenseDate === 'string' ? body.expenseDate : new Date(body.expenseDate).toISOString().split('T')[0];
      setClauses.push('expense_date = ?');
      values.push(d);
    }
    if (body.matchDayId !== undefined) { setClauses.push('match_day_id = ?'); values.push(body.matchDayId); }

    const now = new Date().toISOString();
    setClauses.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE expenses SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updatedExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as any;

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

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete expense error:', error);
    return errorResponse('Internal server error', 500);
  }
}

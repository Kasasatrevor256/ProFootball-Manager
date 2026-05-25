import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreateExpenseRequest } from '@/lib/types';
import crypto from 'crypto';

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

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const date = expenseDate
      ? (typeof expenseDate === 'string' ? expenseDate : new Date(expenseDate).toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];

    db.prepare(
      `INSERT INTO expenses (id, description, category, amount, expense_date, match_day_id, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, description, category, amount, date, matchDayId ?? null, authUser.uid, now, now);

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as any;

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

    const conditions: string[] = [];
    const values: any[] = [];

    if (category) { conditions.push('category = ?'); values.push(category); }
    if (matchDayId) { conditions.push('match_day_id = ?'); values.push(matchDayId); }
    if (startDate) { conditions.push('expense_date >= ?'); values.push(startDate); }
    if (endDate) { conditions.push('expense_date <= ?'); values.push(endDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = (db.prepare(`SELECT COUNT(*) as count FROM expenses ${where}`).get(...values) as any).count;
    values.push(limit, skip);

    const rows = db
      .prepare(`SELECT * FROM expenses ${where} ORDER BY expense_date DESC LIMIT ? OFFSET ?`)
      .all(...values) as any[];

    const mappedExpenses = rows.map((expense) => ({
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

    return successResponse({ data: mappedExpenses, total, skip, limit });
  } catch (error) {
    console.error('Get expenses error:', error);
    return errorResponse('Internal server error', 500);
  }
}

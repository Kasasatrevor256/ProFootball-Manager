import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';

interface DailyFinancialSummary {
  selectedDate: string;
  payments: any[];
  expenses: any[];
  summary: {
    totalPayments: number;
    totalExpenses: number;
    netAmount: number;
    paymentsCount: number;
    expensesCount: number;
    uniquePlayers: number;
    paymentsByType: {
      annual: { count: number; amount: number };
      monthly: { count: number; amount: number };
      pitch: { count: number; amount: number };
      matchday: { count: number; amount: number };
    };
    expensesByCategory: Record<string, { count: number; amount: number }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return errorResponse('Date parameter is required', 400);
    }

    const paymentRows = db
      .prepare('SELECT * FROM payments WHERE date = ? ORDER BY created_at DESC')
      .all(date) as any[];

    const expenseRows = db
      .prepare('SELECT * FROM expenses WHERE expense_date = ? ORDER BY created_at DESC')
      .all(date) as any[];

    const payments = paymentRows.map((p) => ({
      id: p.id,
      playerId: p.player_id,
      playerName: p.player_name,
      paymentType: p.payment_type,
      amount: parseFloat(p.amount.toString()),
      date: p.date,
      createdAt: p.created_at,
    }));

    const expenses = expenseRows.map((e) => ({
      id: e.id,
      category: e.category,
      amount: parseFloat(e.amount.toString()),
      description: e.description,
      expenseDate: e.expense_date,
      matchDayId: e.match_day_id,
      createdAt: e.created_at,
    }));

    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netAmount = totalPayments - totalExpenses;
    const uniquePlayers = new Set(payments.map((p) => p.playerId)).size;

    const paymentsByType = {
      annual: { count: 0, amount: 0 },
      monthly: { count: 0, amount: 0 },
      pitch: { count: 0, amount: 0 },
      matchday: { count: 0, amount: 0 },
    };

    payments.forEach((payment) => {
      if (payment.paymentType in paymentsByType) {
        paymentsByType[payment.paymentType as keyof typeof paymentsByType].count++;
        paymentsByType[payment.paymentType as keyof typeof paymentsByType].amount += payment.amount;
      }
    });

    const expensesByCategory: Record<string, { count: number; amount: number }> = {};
    expenses.forEach((expense) => {
      if (!expensesByCategory[expense.category]) {
        expensesByCategory[expense.category] = { count: 0, amount: 0 };
      }
      expensesByCategory[expense.category].count++;
      expensesByCategory[expense.category].amount += expense.amount;
    });

    const reportData: DailyFinancialSummary = {
      selectedDate: date,
      payments: payments.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return b.amount - a.amount;
      }),
      expenses: expenses.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeB - timeA;
        return b.amount - a.amount;
      }),
      summary: {
        totalPayments,
        totalExpenses,
        netAmount,
        paymentsCount: payments.length,
        expensesCount: expenses.length,
        uniquePlayers,
        paymentsByType,
        expensesByCategory,
      },
    };

    return successResponse(reportData);
  } catch (error) {
    console.error('Daily report error:', error);
    return errorResponse('Internal server error', 500);
  }
}

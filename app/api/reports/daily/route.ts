import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
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

    // Fetch payments and expenses for the selected date
    const [paymentsResult, expensesResult] = await Promise.all([
      supabaseAdmin
        .from('payments')
        .select('*')
        .eq('date', date)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('expenses')
        .select('*')
        .eq('expense_date', date)
        .order('created_at', { ascending: false })
    ]);

    if (paymentsResult.error || expensesResult.error) {
      console.error('Error fetching data:', paymentsResult.error || expensesResult.error);
      return errorResponse('Failed to fetch data', 500);
    }

    const payments = (paymentsResult.data || []).map((p: any) => ({
      id: p.id,
      playerId: p.player_id,
      playerName: p.player_name,
      paymentType: p.payment_type,
      amount: parseFloat(p.amount.toString()),
      date: p.date,
      createdAt: p.created_at,
    }));

    const expenses = (expensesResult.data || []).map((e: any) => ({
      id: e.id,
      category: e.category,
      amount: parseFloat(e.amount.toString()),
      description: e.description,
      expenseDate: e.expense_date,
      matchDayId: e.match_day_id,
      createdAt: e.created_at,
    }));

    // Calculate summary statistics
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netAmount = totalPayments - totalExpenses;
    const uniquePlayers = new Set(payments.map(p => p.playerId)).size;

    // Group payments by type
    const paymentsByType = {
      annual: { count: 0, amount: 0 },
      monthly: { count: 0, amount: 0 },
      pitch: { count: 0, amount: 0 },
      matchday: { count: 0, amount: 0 }
    };

    payments.forEach(payment => {
      if (payment.paymentType in paymentsByType) {
        paymentsByType[payment.paymentType as keyof typeof paymentsByType].count++;
        paymentsByType[payment.paymentType as keyof typeof paymentsByType].amount += payment.amount;
      }
    });

    // Group expenses by category
    const expensesByCategory: Record<string, { count: number; amount: number }> = {};
    expenses.forEach(expense => {
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
        if (timeA !== timeB) {
          return timeB - timeA;
        }
        return b.amount - a.amount;
      }),
      expenses: expenses.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) {
          return timeB - timeA;
        }
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
        expensesByCategory
      }
    };

    return successResponse(reportData);
  } catch (error) {
    console.error('Daily report error:', error);
    return errorResponse('Internal server error', 500);
  }
}



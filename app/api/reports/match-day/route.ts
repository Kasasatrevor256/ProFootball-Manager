import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';

interface MatchDayReportData {
  matchDayId: string;
  matchDate: string;
  opponent: string | null;
  venue: string | null;
  matchType: string;
  totalExpenses: number;
  totalPayments: number;
  netBalance: number;
  expenseBreakdown: { category: string; amount: number }[];
  paymentBreakdown: { playerName: string; amount: number }[];
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const matchDayId = searchParams.get('match_day_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (matchDayId) {
      const matchDay = db.prepare('SELECT * FROM match_days WHERE id = ?').get(matchDayId) as any;

      if (!matchDay) {
        return errorResponse('Match day not found', 404);
      }

      const expenseRows = db
        .prepare('SELECT * FROM expenses WHERE match_day_id = ?')
        .all(matchDayId) as any[];

      const paymentRows = db
        .prepare("SELECT * FROM payments WHERE payment_type = 'matchday' AND date = ?")
        .all(matchDay.match_date) as any[];

      const expenses = expenseRows.map((e) => ({
        id: e.id,
        description: e.description || '',
        category: e.category,
        amount: parseFloat(e.amount.toString()),
        expense_date: e.expense_date,
        match_day_id: e.match_day_id,
        created_at: e.created_at,
      }));

      const payments = paymentRows.map((p) => ({
        id: p.id,
        playerId: p.player_id,
        playerName: p.player_name,
        amount: parseFloat(p.amount.toString()),
        date: p.date,
      }));

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

      const expenseBreakdown = expenses.reduce((acc: any[], expense) => {
        const existing = acc.find((item) => item.category === expense.category);
        if (existing) {
          existing.amount += expense.amount;
        } else {
          acc.push({ category: expense.category, amount: expense.amount });
        }
        return acc;
      }, []);

      const paymentBreakdown = payments.map((p) => ({
        playerName: p.playerName,
        amount: p.amount,
      }));

      return successResponse({
        matchDayId: matchDay.id,
        matchDate: matchDay.match_date,
        opponent: matchDay.opponent || null,
        venue: matchDay.venue || null,
        matchType: matchDay.match_type,
        totalExpenses,
        totalPayments,
        netBalance: totalPayments - totalExpenses,
        expenseBreakdown,
        paymentBreakdown,
        expenses,
        payments,
      });
    }

    // List all match days with summaries
    const conditions: string[] = [];
    const values: any[] = [];
    if (startDate) { conditions.push('match_date >= ?'); values.push(startDate); }
    if (endDate) { conditions.push('match_date <= ?'); values.push(endDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const matchDays = db
      .prepare(`SELECT * FROM match_days ${where} ORDER BY match_date DESC`)
      .all(...values) as any[];

    const allExpenseRows = db.prepare('SELECT * FROM expenses').all() as any[];
    const allPaymentRows = db
      .prepare("SELECT * FROM payments WHERE payment_type = 'matchday'")
      .all() as any[];

    const allExpenses = allExpenseRows.map((e) => ({
      id: e.id,
      matchDayId: e.match_day_id,
      category: e.category,
      amount: parseFloat(e.amount.toString()),
    }));

    const allPayments = allPaymentRows.map((p) => ({
      id: p.id,
      playerName: p.player_name,
      amount: parseFloat(p.amount.toString()),
      date: p.date,
    }));

    const reportData: MatchDayReportData[] = [];

    for (const matchDay of matchDays) {
      const expenses = allExpenses.filter((e) => e.matchDayId === matchDay.id);
      const payments = allPayments.filter((p) => {
        const paymentDate = new Date(p.date).toISOString().split('T')[0];
        const matchDate = new Date(matchDay.match_date).toISOString().split('T')[0];
        return paymentDate === matchDate;
      });

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

      const expenseBreakdown = expenses.reduce((acc: any[], expense) => {
        const existing = acc.find((item) => item.category === expense.category);
        if (existing) {
          existing.amount += expense.amount;
        } else {
          acc.push({ category: expense.category, amount: expense.amount });
        }
        return acc;
      }, []);

      const paymentBreakdown = payments.map((p) => ({
        playerName: p.playerName,
        amount: p.amount,
      }));

      reportData.push({
        matchDayId: matchDay.id,
        matchDate: matchDay.match_date,
        opponent: matchDay.opponent || null,
        venue: matchDay.venue || null,
        matchType: matchDay.match_type,
        totalExpenses,
        totalPayments,
        netBalance: totalPayments - totalExpenses,
        expenseBreakdown,
        paymentBreakdown,
      });
    }

    return successResponse({
      data: reportData,
      totalRecords: reportData.length,
    });
  } catch (error) {
    console.error('Match day report error:', error);
    return errorResponse('Internal server error', 500);
  }
}

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
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
  expenseBreakdown: {
    category: string;
    amount: number;
  }[];
  paymentBreakdown: {
    playerName: string;
    amount: number;
  }[];
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

    // If specific match day requested
    if (matchDayId) {
      // Fetch match day
      const { data: matchDay, error: matchDayError } = await supabaseAdmin
        .from('match_days')
        .select('*')
        .eq('id', matchDayId)
        .single();

      if (matchDayError || !matchDay) {
        return errorResponse('Match day not found', 404);
      }

      // Fetch expenses and payments for this match day
      const [expensesResult, paymentsResult] = await Promise.all([
        supabaseAdmin
          .from('expenses')
          .select('*')
          .eq('match_day_id', matchDayId),
        supabaseAdmin
          .from('payments')
          .select('*')
          .eq('payment_type', 'matchday')
          .eq('date', matchDay.match_date)
      ]);

      if (expensesResult.error || paymentsResult.error) {
        console.error('Error fetching data:', expensesResult.error || paymentsResult.error);
        return errorResponse('Failed to fetch data', 500);
      }

      const expenses = (expensesResult.data || []).map((e: any) => ({
        id: e.id,
        description: e.description || '',
        category: e.category,
        amount: parseFloat(e.amount.toString()),
        expense_date: e.expense_date,
        match_day_id: e.match_day_id,
        created_at: e.created_at,
      }));

      const payments = (paymentsResult.data || []).map((p: any) => ({
        id: p.id,
        playerId: p.player_id,
        playerName: p.player_name,
        amount: parseFloat(p.amount.toString()),
        date: p.date,
      }));

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

      const expenseBreakdown = expenses.reduce((acc: any[], expense) => {
        const existing = acc.find(item => item.category === expense.category);
        if (existing) {
          existing.amount += expense.amount;
        } else {
          acc.push({ category: expense.category, amount: expense.amount });
        }
        return acc;
      }, []);

      const paymentBreakdown = payments.map(p => ({
        playerName: p.playerName,
        amount: p.amount
      }));

      const reportData = {
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
        payments
      };

      return successResponse(reportData);
    }

    // List all match days with summaries
    let matchDaysQuery = supabaseAdmin
      .from('match_days')
      .select('*')
      .order('match_date', { ascending: false });

    if (startDate) {
      matchDaysQuery = matchDaysQuery.gte('match_date', startDate);
    }
    if (endDate) {
      matchDaysQuery = matchDaysQuery.lte('match_date', endDate);
    }

    const { data: matchDays, error: matchDaysError } = await matchDaysQuery;

    if (matchDaysError) {
      console.error('Error fetching match days:', matchDaysError);
      return errorResponse('Failed to fetch match days', 500);
    }

    // Fetch all expenses and matchday payments
    const [expensesResult, paymentsResult] = await Promise.all([
      supabaseAdmin.from('expenses').select('*'),
      supabaseAdmin
        .from('payments')
        .select('*')
        .eq('payment_type', 'matchday')
    ]);

    if (expensesResult.error || paymentsResult.error) {
      console.error('Error fetching data:', expensesResult.error || paymentsResult.error);
      return errorResponse('Failed to fetch data', 500);
    }

    const allExpenses = (expensesResult.data || []).map((e: any) => ({
      id: e.id,
      matchDayId: e.match_day_id,
      category: e.category,
      amount: parseFloat(e.amount.toString()),
    }));

    const allPayments = (paymentsResult.data || []).map((p: any) => ({
      id: p.id,
      playerName: p.player_name,
      amount: parseFloat(p.amount.toString()),
      date: p.date,
    }));

    const reportData: MatchDayReportData[] = [];

    for (const matchDay of matchDays || []) {
      const expenses = allExpenses.filter(e => e.matchDayId === matchDay.id);
      const payments = allPayments.filter(p => {
        const paymentDate = new Date(p.date).toISOString().split('T')[0];
        const matchDate = new Date(matchDay.match_date).toISOString().split('T')[0];
        return paymentDate === matchDate;
      });

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

      const expenseBreakdown = expenses.reduce((acc: any[], expense) => {
        const existing = acc.find(item => item.category === expense.category);
        if (existing) {
          existing.amount += expense.amount;
        } else {
          acc.push({ category: expense.category, amount: expense.amount });
        }
        return acc;
      }, []);

      const paymentBreakdown = payments.map(p => ({
        playerName: p.playerName,
        amount: p.amount
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
        paymentBreakdown
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

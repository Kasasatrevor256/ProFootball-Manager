import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const payments = db
      .prepare('SELECT payment_type, amount FROM payments')
      .all() as any[];

    const stats = {
      annual_total: 0,
      monthly_total: 0,
      pitch_total: 0,
      matchday_total: 0,
      total_amount: 0,
      total_payments: payments.length,
    };

    payments.forEach((payment) => {
      const amount = parseFloat(payment.amount.toString()) || 0;
      stats.total_amount += amount;

      switch (payment.payment_type) {
        case 'annual':
          stats.annual_total += amount;
          break;
        case 'monthly':
          stats.monthly_total += amount;
          break;
        case 'pitch':
          stats.pitch_total += amount;
          break;
        case 'matchday':
          stats.matchday_total += amount;
          break;
      }
    });

    return successResponse(stats);
  } catch (error) {
    console.error('Payment summary error:', error);
    return errorResponse('Internal server error', 500);
  }
}

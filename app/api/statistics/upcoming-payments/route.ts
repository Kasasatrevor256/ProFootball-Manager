import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';

interface PlayerPaymentStatus {
  player: {
    id: string;
    name: string;
    phone: string;
    annual: number;
    monthly: number;
    pitch: number;
  };
  lastPayment: {
    paymentType: string;
    amount: number;
    date: string;
  } | null;
  isDue: boolean;
  isOverdue: boolean;
  daysOverdue: number;
  expectedAmount: number;
  paymentType: string;
  nextDueDate: string | null;
  status: 'up_to_date' | 'due_soon' | 'overdue';
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const playerRows = db.prepare('SELECT * FROM players').all() as any[];
    const paymentRows = db
      .prepare('SELECT * FROM payments ORDER BY date DESC')
      .all() as any[];

    const players = playerRows.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      annual: parseFloat(p.annual.toString()),
      monthly: parseFloat(p.monthly.toString()),
      pitch: parseFloat(p.pitch.toString()),
    }));

    const payments = paymentRows.map((p) => ({
      id: p.id,
      playerId: p.player_id,
      playerName: p.player_name,
      paymentType: p.payment_type,
      amount: parseFloat(p.amount.toString()),
      date: p.date,
    }));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const playersWithStatus: PlayerPaymentStatus[] = [];

    for (const player of players) {
      const playerPayments = payments.filter((p) => p.playerId === player.id);
      const lastPayment = playerPayments.length > 0 ? playerPayments[0] : null;

      const fiscalStartMonth = 7;
      let fiscalYear = currentYear;
      if (currentMonth < fiscalStartMonth) {
        fiscalYear = currentYear - 1;
      }

      const fiscalYearStart = new Date(fiscalYear, fiscalStartMonth - 1, 1);
      const monthsSinceFiscalStart = Math.floor(
        (now.getTime() - fiscalYearStart.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
      );

      const annualPayments = playerPayments.filter(
        (p) => p.paymentType === 'annual' && new Date(p.date) >= fiscalYearStart
      );
      const hasAnnual = annualPayments.length > 0;

      const monthlyPayments = playerPayments.filter((p) => {
        const paymentDate = new Date(p.date);
        return p.paymentType === 'monthly' && paymentDate >= fiscalYearStart;
      });
      const monthlyPaid = monthlyPayments.length;

      let isDue = false;
      let isOverdue = false;
      let daysOverdue = 0;
      const expectedAmount = player.monthly;
      const paymentType = 'monthly';
      let status: 'up_to_date' | 'due_soon' | 'overdue' = 'up_to_date';

      if (!hasAnnual) {
        const expectedMonthlyPayments = monthsSinceFiscalStart + 1;
        if (monthlyPaid < expectedMonthlyPayments) {
          isDue = true;
          const missedMonths = expectedMonthlyPayments - monthlyPaid;
          if (missedMonths > 1) {
            isOverdue = true;
            daysOverdue = missedMonths * 30;
            status = 'overdue';
          } else {
            status = 'due_soon';
          }
        }
      }

      if (isDue || isOverdue) {
        playersWithStatus.push({
          player: {
            id: player.id,
            name: player.name,
            phone: player.phone,
            annual: player.annual,
            monthly: player.monthly,
            pitch: player.pitch,
          },
          lastPayment: lastPayment
            ? {
                paymentType: lastPayment.paymentType,
                amount: lastPayment.amount,
                date: lastPayment.date,
              }
            : null,
          isDue,
          isOverdue,
          daysOverdue,
          expectedAmount,
          paymentType,
          nextDueDate: null,
          status,
        });
      }
    }

    playersWithStatus.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return successResponse(playersWithStatus.slice(0, limit));
  } catch (error) {
    console.error('Upcoming payments error:', error);
    return errorResponse('Internal server error', 500);
  }
}

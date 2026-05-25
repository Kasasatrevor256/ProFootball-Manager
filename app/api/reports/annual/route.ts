import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';

interface PlayerAnnualData {
  playerId: string;
  playerName: string;
  phone: string;
  expectedAmount: number;
  amountPaid: number;
  balance: number;
  carryover: number;
  totalDue: number;
  lastPaymentDate: string | null;
  paymentCount: number;
  status: 'Complete' | 'Partial' | 'Unpaid';
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const playerRows = db.prepare('SELECT * FROM players').all() as any[];
    const paymentRows = db
      .prepare("SELECT * FROM payments WHERE payment_type = 'annual' ORDER BY date DESC")
      .all() as any[];

    const players = playerRows.map((p) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      annual: parseFloat(p.annual.toString()),
    }));

    const allPayments = paymentRows.map((p) => ({
      id: p.id,
      playerId: p.player_id,
      playerName: p.player_name,
      amount: parseFloat(p.amount.toString()),
      date: p.date,
    }));

    const reportData: PlayerAnnualData[] = [];

    for (const player of players) {
      const yearPayments = allPayments.filter((p) => {
        const paymentYear = new Date(p.date).getFullYear();
        return p.playerId === player.id && paymentYear === year;
      });

      const previousYearPayments = allPayments.filter((p) => {
        const paymentYear = new Date(p.date).getFullYear();
        return p.playerId === player.id && paymentYear === year - 1;
      });

      const expectedAmount = player.annual || 150000;
      const amountPaid = yearPayments.reduce((sum, p) => sum + p.amount, 0);

      let carryover = 0;
      if (year >= 2026) {
        const previousYearPaid = previousYearPayments.reduce((sum, p) => sum + p.amount, 0);
        const previousYearExpected = player.annual || 150000;
        carryover = Math.max(0, previousYearExpected - previousYearPaid);
      }

      const totalDue = expectedAmount + carryover;
      const balance = totalDue - amountPaid;

      const sortedPayments = yearPayments.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastPaymentDate = sortedPayments.length > 0 ? sortedPayments[0].date : null;

      let status: 'Complete' | 'Partial' | 'Unpaid';
      if (amountPaid >= totalDue) {
        status = 'Complete';
      } else if (amountPaid > 0) {
        status = 'Partial';
      } else {
        status = 'Unpaid';
      }

      reportData.push({
        playerId: player.id,
        playerName: player.name,
        phone: player.phone,
        expectedAmount,
        amountPaid,
        balance,
        carryover,
        totalDue,
        lastPaymentDate,
        paymentCount: yearPayments.length,
        status,
      });
    }

    reportData.sort((a, b) => b.balance - a.balance);

    const summary = {
      year,
      totalPlayers: reportData.length,
      totalExpected: reportData.reduce((sum, p) => sum + p.totalDue, 0),
      totalPaid: reportData.reduce((sum, p) => sum + p.amountPaid, 0),
      totalBalance: reportData.reduce((sum, p) => sum + p.balance, 0),
      totalCarryover: reportData.reduce((sum, p) => sum + p.carryover, 0),
      completeCount: reportData.filter((p) => p.status === 'Complete').length,
      partialCount: reportData.filter((p) => p.status === 'Partial').length,
      unpaidCount: reportData.filter((p) => p.status === 'Unpaid').length,
    };

    return successResponse({
      year,
      summary,
      data: reportData,
      totalRecords: reportData.length,
    });
  } catch (error) {
    console.error('Annual report error:', error);
    return errorResponse('Internal server error', 500);
  }
}

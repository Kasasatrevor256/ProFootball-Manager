import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';

interface PlayerPitchData {
  playerId: string;
  playerName: string;
  phone: string;
  expectedAmount: number;
  amountPaid: number;
  balance: number;
  carryoverAmount: number;
  totalAmount: number;
  paymentCount: number;
  lastPaymentDate: string | null;
  status: 'Complete' | 'Incomplete';
  monthKey: string;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || 'all';
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    // Fetch all players and pitch payments in parallel
    const [playersResult, paymentsResult] = await Promise.all([
      supabaseAdmin.from('players').select('*'),
      supabaseAdmin.from('payments')
        .select('*')
        .eq('payment_type', 'pitch')
        .order('date', { ascending: false })
    ]);

    if (playersResult.error || paymentsResult.error) {
      console.error('Error fetching data:', playersResult.error || paymentsResult.error);
      return errorResponse('Failed to fetch data', 500);
    }

    const players = (playersResult.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      pitch: parseFloat(p.pitch.toString()),
    }));

    const allPayments = (paymentsResult.data || []).map((p: any) => ({
      id: p.id,
      playerId: p.player_id,
      playerName: p.player_name,
      amount: parseFloat(p.amount.toString()),
      date: p.date,
    }));

    const reportData: PlayerPitchData[] = [];
    const fiscalStartMonth = 7; // July
    const currentDate = new Date();

    // Determine months to process
    let monthsToProcess: string[] = [];
    
    if (month === 'all') {
      // Generate all months from July 2025 to current
      for (let y = 2025; y <= currentDate.getFullYear(); y++) {
        const startMonth = y === 2025 ? 7 : 1;
        const endMonth = y === currentDate.getFullYear() ? currentDate.getMonth() + 1 : 12;
        for (let m = startMonth; m <= endMonth; m++) {
          monthsToProcess.push(`${y}-${String(m).padStart(2, '0')}`);
        }
      }
    } else {
      monthsToProcess.push(`${year}-${String(parseInt(month)).padStart(2, '0')}`);
    }

    // Process each player and month combination
    for (const player of players) {
      for (const monthKey of monthsToProcess) {
        const [yearStr, monthStr] = monthKey.split('-');
        const yearNum = parseInt(yearStr);
        const monthNum = parseInt(monthStr);
        
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59);

        // Get pitch payments for this player and month
        const pitchPayments = allPayments.filter(p => {
          const paymentDate = new Date(p.date);
          return p.playerId === player.id &&
                 paymentDate >= monthStart &&
                 paymentDate <= monthEnd;
        });

        // Calculate carryover from previous months
        let carryoverAmount = 0;
        if (monthNum > fiscalStartMonth || yearNum > 2025) {
          // Calculate carryover from fiscal year start to this month
          const fiscalYearStart = new Date(yearNum >= 2026 ? yearNum - 1 : 2025, fiscalStartMonth - 1, 1);
          
          // Get all pitch payments from fiscal start to this month
          const fiscalPayments = allPayments.filter(p => {
            const paymentDate = new Date(p.date);
            return p.playerId === player.id &&
                   paymentDate >= fiscalYearStart &&
                   paymentDate < monthStart;
          });

          const monthsSinceFiscalStart = Math.floor((monthStart.getTime() - fiscalYearStart.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
          const expectedAmount = monthsSinceFiscalStart * player.pitch;
          const paidAmount = fiscalPayments.reduce((sum, p) => sum + p.amount, 0);
          carryoverAmount = Math.max(0, expectedAmount - paidAmount);
        }

        const baseAmount = player.pitch;
        const totalAmount = baseAmount + carryoverAmount;
        const amountPaid = pitchPayments.reduce((sum, p) => sum + p.amount, 0);
        const balance = Math.max(0, totalAmount - amountPaid);
        const status: 'Complete' | 'Incomplete' = balance <= 0 ? 'Complete' : 'Incomplete';

        const sortedPayments = pitchPayments.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const lastPaymentDate = sortedPayments.length > 0 ? sortedPayments[0].date : null;

        reportData.push({
          playerId: player.id,
          playerName: player.name,
          phone: player.phone,
          expectedAmount: baseAmount,
          amountPaid,
          balance,
          carryoverAmount,
          totalAmount,
          paymentCount: pitchPayments.length,
          lastPaymentDate,
          status,
          monthKey,
        });
      }
    }

    // Calculate summary
    const summary = {
      month: month === 'all' ? 'all' : parseInt(month),
      year,
      totalPlayers: new Set(reportData.map(r => r.playerId)).size,
      totalExpected: reportData.reduce((sum, p) => sum + p.totalAmount, 0),
      totalPaid: reportData.reduce((sum, p) => sum + p.amountPaid, 0),
      totalBalance: reportData.reduce((sum, p) => sum + p.balance, 0),
      totalCarryover: reportData.reduce((sum, p) => sum + p.carryoverAmount, 0),
      completeCount: reportData.filter(p => p.status === 'Complete').length,
      incompleteCount: reportData.filter(p => p.status === 'Incomplete').length,
    };

    return successResponse({
      summary,
      data: reportData,
      totalRecords: reportData.length,
    });
  } catch (error) {
    console.error('Pitch report error:', error);
    return errorResponse('Internal server error', 500);
  }
}

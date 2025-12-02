import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreatePaymentRequest } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body: CreatePaymentRequest = await request.json();
    const { playerId, playerName, paymentType, amount, date } = body;

    if (!playerId || !playerName || !paymentType || !amount) {
      return errorResponse('All required fields must be provided', 400);
    }

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .insert({
        player_id: playerId,
        player_name: playerName,
        payment_type: paymentType,
        amount: amount,
        date: date || new Date().toISOString().split('T')[0],
        created_by: authUser.uid,
      })
      .select()
      .single();

    if (error) {
      console.error('Create payment error:', error);
      return errorResponse('Failed to create payment', 500);
    }

    // Map snake_case to camelCase for response
    const response = {
      id: payment.id,
      playerId: payment.player_id,
      playerName: payment.player_name,
      paymentType: payment.payment_type,
      amount: parseFloat(payment.amount.toString()),
      date: payment.date,
      createdBy: payment.created_by,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    };

    return successResponse(response, 201);
  } catch (error) {
    console.error('Create payment error:', error);
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
    const playerId = searchParams.get('player_id');
    const paymentType = searchParams.get('payment_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabaseAdmin
      .from('payments')
      .select('*')
      .order('date', { ascending: false })
      .range(skip, skip + limit - 1);

    // Apply filters
    if (playerId) {
      query = query.eq('player_id', playerId);
    }
    if (paymentType) {
      query = query.eq('payment_type', paymentType);
    }
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Get payments error:', error);
      return errorResponse('Failed to fetch payments', 500);
    }

    // Map snake_case to camelCase for frontend
    const mappedPayments = (payments || []).map((payment: any) => ({
      id: payment.id,
      playerId: payment.player_id,
      playerName: payment.player_name,
      paymentType: payment.payment_type,
      amount: parseFloat(payment.amount.toString()),
      date: payment.date,
      createdBy: payment.created_by,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    }));

    return successResponse(mappedPayments);
  } catch (error) {
    console.error('Get payments error:', error);
    return errorResponse('Internal server error', 500);
  }
}

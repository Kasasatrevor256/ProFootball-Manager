import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { UpdatePaymentRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !payment) {
      return errorResponse('Payment not found', 404);
    }

    return successResponse({
      id: payment.id,
      playerId: payment.player_id,
      playerName: payment.player_name,
      paymentType: payment.payment_type,
      amount: parseFloat(payment.amount.toString()),
      date: payment.date,
      createdBy: payment.created_by,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body: UpdatePaymentRequest = await request.json();

    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingPayment) {
      return errorResponse('Payment not found', 404);
    }

    const updateData: any = {};
    if (body.playerId !== undefined) updateData.player_id = body.playerId;
    if (body.playerName !== undefined) updateData.player_name = body.playerName;
    if (body.paymentType !== undefined) updateData.payment_type = body.paymentType;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.date !== undefined) updateData.date = body.date;

    const { data: updatedPayment, error } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update payment error:', error);
      return errorResponse('Failed to update payment', 500);
    }

    return successResponse({
      id: updatedPayment.id,
      playerId: updatedPayment.player_id,
      playerName: updatedPayment.player_name,
      paymentType: updatedPayment.payment_type,
      amount: parseFloat(updatedPayment.amount.toString()),
      date: updatedPayment.date,
      createdBy: updatedPayment.created_by,
      createdAt: updatedPayment.created_at,
      updatedAt: updatedPayment.updated_at,
    });
  } catch (error) {
    console.error('Update payment error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    const { id } = await params;
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { error } = await supabaseAdmin
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete payment error:', error);
      return errorResponse('Failed to delete payment', 500);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete payment error:', error);
    return errorResponse('Internal server error', 500);
  }
}

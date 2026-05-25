import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
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

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;

    if (!payment) {
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

    const existingPayment = db.prepare('SELECT id FROM payments WHERE id = ?').get(id) as any;
    if (!existingPayment) {
      return errorResponse('Payment not found', 404);
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    if (body.playerId !== undefined) { setClauses.push('player_id = ?'); values.push(body.playerId); }
    if (body.playerName !== undefined) { setClauses.push('player_name = ?'); values.push(body.playerName); }
    if (body.paymentType !== undefined) { setClauses.push('payment_type = ?'); values.push(body.paymentType); }
    if (body.amount !== undefined) { setClauses.push('amount = ?'); values.push(body.amount); }
    if (body.date !== undefined) {
      const d = typeof body.date === 'string' ? body.date : new Date(body.date).toISOString().split('T')[0];
      setClauses.push('date = ?');
      values.push(d);
    }

    const now = new Date().toISOString();
    setClauses.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE payments SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updatedPayment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;

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

    db.prepare('DELETE FROM payments WHERE id = ?').run(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete payment error:', error);
    return errorResponse('Internal server error', 500);
  }
}

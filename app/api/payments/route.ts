import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreatePaymentRequest } from '@/lib/types';
import crypto from 'crypto';

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

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const paymentDate = date
      ? (typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0];

    db.prepare(
      `INSERT INTO payments (id, player_id, player_name, payment_type, amount, date, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, playerId, playerName, paymentType, amount, paymentDate, authUser.uid, now, now);

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;

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
    }, 201);
  } catch (error) {
    console.error('Create payment error:', error);
    return errorResponse('Internal server error', 500, { internal: error, request });
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

    const conditions: string[] = [];
    const values: any[] = [];

    if (playerId) { conditions.push('player_id = ?'); values.push(playerId); }
    if (paymentType) { conditions.push('payment_type = ?'); values.push(paymentType); }
    if (startDate) { conditions.push('date >= ?'); values.push(startDate); }
    if (endDate) { conditions.push('date <= ?'); values.push(endDate); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = (db.prepare(`SELECT COUNT(*) as count FROM payments ${where}`).get(...values) as any).count;
    values.push(limit, skip);

    const rows = db
      .prepare(`SELECT * FROM payments ${where} ORDER BY date DESC LIMIT ? OFFSET ?`)
      .all(...values) as any[];

    const mappedPayments = rows.map((payment) => ({
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

    return successResponse({ data: mappedPayments, total, skip, limit });
  } catch (error) {
    console.error('Get payments error:', error);
    return errorResponse('Internal server error', 500, { internal: error, request });
  }
}

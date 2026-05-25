import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreateMatchDayRequest } from '@/lib/types';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body: CreateMatchDayRequest = await request.json();
    const { matchDate, opponent, venue, matchType } = body;

    if (!matchDate || !matchType) {
      return errorResponse('Match date and match type are required', 400);
    }

    const matchDateStr = typeof matchDate === 'string' ? matchDate : new Date(matchDate).toISOString().split('T')[0];

    // Check if match day already exists for this date
    const existingMatch = db
      .prepare('SELECT id FROM match_days WHERE match_date = ? LIMIT 1')
      .get(matchDateStr) as any;

    if (existingMatch) {
      return errorResponse('Match day already exists for this date', 400);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO match_days (id, match_date, opponent, venue, match_type, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, matchDateStr, opponent ?? null, venue ?? null, matchType, now);

    const matchDay = db.prepare('SELECT * FROM match_days WHERE id = ?').get(id) as any;

    return successResponse({
      id: matchDay.id,
      matchDate: matchDay.match_date,
      opponent: matchDay.opponent,
      venue: matchDay.venue,
      matchType: matchDay.match_type,
      createdAt: matchDay.created_at,
    }, 201);
  } catch (error) {
    console.error('Create match day error:', error);
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

    const total = (db.prepare('SELECT COUNT(*) as count FROM match_days').get() as any).count;

    const rows = db
      .prepare('SELECT * FROM match_days ORDER BY match_date DESC LIMIT ? OFFSET ?')
      .all(limit, skip) as any[];

    const mappedMatchDays = rows.map((matchDay) => ({
      id: matchDay.id,
      matchDate: matchDay.match_date,
      opponent: matchDay.opponent,
      venue: matchDay.venue,
      matchType: matchDay.match_type,
      createdAt: matchDay.created_at,
    }));

    return successResponse({ data: mappedMatchDays, total, skip, limit });
  } catch (error) {
    console.error('Get match days error:', error);
    return errorResponse('Internal server error', 500);
  }
}

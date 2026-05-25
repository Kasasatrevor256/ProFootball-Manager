import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { UpdateMatchDayRequest } from '@/lib/types';

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

    const matchDay = db.prepare('SELECT * FROM match_days WHERE id = ?').get(id) as any;

    if (!matchDay) {
      return errorResponse('Match day not found', 404);
    }

    return successResponse({
      id: matchDay.id,
      matchDate: matchDay.match_date,
      opponent: matchDay.opponent,
      venue: matchDay.venue,
      matchType: matchDay.match_type,
      createdAt: matchDay.created_at,
    });
  } catch (error) {
    console.error('Get match day error:', error);
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

    const body: UpdateMatchDayRequest = await request.json();

    const existingMatchDay = db.prepare('SELECT id FROM match_days WHERE id = ?').get(id) as any;
    if (!existingMatchDay) {
      return errorResponse('Match day not found', 404);
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    if (body.matchDate !== undefined) {
      const d = typeof body.matchDate === 'string' ? body.matchDate : new Date(body.matchDate).toISOString().split('T')[0];
      setClauses.push('match_date = ?');
      values.push(d);
    }
    if (body.opponent !== undefined) { setClauses.push('opponent = ?'); values.push(body.opponent); }
    if (body.venue !== undefined) { setClauses.push('venue = ?'); values.push(body.venue); }
    if (body.matchType !== undefined) { setClauses.push('match_type = ?'); values.push(body.matchType); }

    values.push(id);

    db.prepare(`UPDATE match_days SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updatedMatchDay = db.prepare('SELECT * FROM match_days WHERE id = ?').get(id) as any;

    return successResponse({
      id: updatedMatchDay.id,
      matchDate: updatedMatchDay.match_date,
      opponent: updatedMatchDay.opponent,
      venue: updatedMatchDay.venue,
      matchType: updatedMatchDay.match_type,
      createdAt: updatedMatchDay.created_at,
    });
  } catch (error) {
    console.error('Update match day error:', error);
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

    db.prepare('DELETE FROM match_days WHERE id = ?').run(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete match day error:', error);
    return errorResponse('Internal server error', 500);
  }
}

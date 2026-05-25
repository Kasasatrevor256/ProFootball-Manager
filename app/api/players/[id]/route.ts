import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { UpdatePlayerRequest } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id) as any;

    if (!player) {
      return errorResponse('Player not found', 404);
    }

    return successResponse({
      id: player.id,
      name: player.name,
      phone: player.phone,
      annual: parseFloat(player.annual.toString()),
      monthly: parseFloat(player.monthly.toString()),
      pitch: parseFloat(player.pitch.toString()),
      matchDay: player.match_day,
      createdAt: player.created_at,
      updatedAt: player.updated_at,
    });
  } catch (error) {
    console.error('Get player error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body: UpdatePlayerRequest = await request.json();

    const existingPlayer = db.prepare('SELECT id FROM players WHERE id = ?').get(id) as any;
    if (!existingPlayer) {
      return errorResponse('Player not found', 404);
    }

    const setClauses: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) { setClauses.push('name = ?'); values.push(body.name); }
    if (body.phone !== undefined) { setClauses.push('phone = ?'); values.push(body.phone); }
    if (body.annual !== undefined) { setClauses.push('annual = ?'); values.push(body.annual); }
    if (body.monthly !== undefined) { setClauses.push('monthly = ?'); values.push(body.monthly); }
    if (body.pitch !== undefined) { setClauses.push('pitch = ?'); values.push(body.pitch); }
    if (body.matchDay !== undefined) { setClauses.push('match_day = ?'); values.push(body.matchDay); }

    const now = new Date().toISOString();
    setClauses.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`UPDATE players SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(id) as any;

    return successResponse({
      id: updatedPlayer.id,
      name: updatedPlayer.name,
      phone: updatedPlayer.phone,
      annual: parseFloat(updatedPlayer.annual.toString()),
      monthly: parseFloat(updatedPlayer.monthly.toString()),
      pitch: parseFloat(updatedPlayer.pitch.toString()),
      matchDay: updatedPlayer.match_day,
      createdAt: updatedPlayer.created_at,
      updatedAt: updatedPlayer.updated_at,
    });
  } catch (error) {
    console.error('Update player error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    db.prepare('DELETE FROM players WHERE id = ?').run(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete player error:', error);
    return errorResponse('Internal server error', 500);
  }
}

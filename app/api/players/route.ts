import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreatePlayerRequest } from '@/lib/types';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body: CreatePlayerRequest = await request.json();
    const { name, phone, annual = 150000, monthly = 10000, pitch = 5000, matchDay } = body;

    if (!name || !phone) {
      return errorResponse('Name and phone are required', 400);
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO players (id, name, phone, annual, monthly, pitch, match_day, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, phone, annual, monthly, pitch, matchDay ?? null, now, now);

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id) as any;

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
    }, 201);
  } catch (error) {
    console.error('Create player error:', error);
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
    const search = searchParams.get('search');

    const total = (db.prepare('SELECT COUNT(*) as count FROM players').get() as any).count;

    const rows = db
      .prepare('SELECT * FROM players ORDER BY name ASC LIMIT ? OFFSET ?')
      .all(limit, skip) as any[];

    let players = rows.map((player) => ({
      id: player.id,
      name: player.name,
      phone: player.phone,
      annual: parseFloat(player.annual.toString()),
      monthly: parseFloat(player.monthly.toString()),
      pitch: parseFloat(player.pitch.toString()),
      matchDay: player.match_day,
      createdAt: player.created_at,
      updatedAt: player.updated_at,
    }));

    if (search) {
      const searchLower = search.toLowerCase();
      players = players.filter(
        (player) =>
          player.name.toLowerCase().includes(searchLower) ||
          player.phone.includes(search)
      );
    }

    return successResponse({ data: players, total, skip, limit });
  } catch (error) {
    console.error('Get players error:', error);
    return errorResponse('Internal server error', 500);
  }
}

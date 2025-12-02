import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreatePlayerRequest } from '@/lib/types';

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

    const { data: player, error } = await supabaseAdmin
      .from('players')
      .insert({
        name,
        phone,
        annual,
        monthly,
        pitch,
        match_day: matchDay || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Create player error:', error);
      return errorResponse('Failed to create player', 500);
    }

    const response = {
      id: player.id,
      name: player.name,
      phone: player.phone,
      annual: parseFloat(player.annual.toString()),
      monthly: parseFloat(player.monthly.toString()),
      pitch: parseFloat(player.pitch.toString()),
      matchDay: player.match_day,
      createdAt: player.created_at,
      updatedAt: player.updated_at,
    };

    return successResponse(response, 201);
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

    let query = supabaseAdmin
      .from('players')
      .select('*')
      .order('name', { ascending: true })
      .range(skip, skip + limit - 1);

    const { data: players, error } = await query;

    if (error) {
      console.error('Get players error:', error);
      return errorResponse('Failed to fetch players', 500);
    }

    let filteredPlayers = (players || []).map((player: any) => ({
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
      filteredPlayers = filteredPlayers.filter(player =>
        player.name.toLowerCase().includes(searchLower) ||
        player.phone.includes(search)
      );
    }

    return successResponse(filteredPlayers);
  } catch (error) {
    console.error('Get players error:', error);
    return errorResponse('Internal server error', 500);
  }
}

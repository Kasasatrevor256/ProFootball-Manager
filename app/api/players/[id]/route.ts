import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
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
    const { data: player, error } = await supabaseAdmin
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !player) {
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

    const { data: existingPlayer } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingPlayer) {
      return errorResponse('Player not found', 404);
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.annual !== undefined) updateData.annual = body.annual;
    if (body.monthly !== undefined) updateData.monthly = body.monthly;
    if (body.pitch !== undefined) updateData.pitch = body.pitch;
    if (body.matchDay !== undefined) updateData.match_day = body.matchDay;

    const { data: updatedPlayer, error } = await supabaseAdmin
      .from('players')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update player error:', error);
      return errorResponse('Failed to update player', 500);
    }

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
    const { error } = await supabaseAdmin
      .from('players')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete player error:', error);
      return errorResponse('Failed to delete player', 500);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete player error:', error);
    return errorResponse('Internal server error', 500);
  }
}

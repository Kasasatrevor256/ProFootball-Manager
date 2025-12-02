import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
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

    const { data: matchDay, error } = await supabaseAdmin
      .from('match_days')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !matchDay) {
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

    const { data: existingMatchDay } = await supabaseAdmin
      .from('match_days')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingMatchDay) {
      return errorResponse('Match day not found', 404);
    }

    const updateData: any = {};
    if (body.matchDate !== undefined) updateData.match_date = body.matchDate;
    if (body.opponent !== undefined) updateData.opponent = body.opponent;
    if (body.venue !== undefined) updateData.venue = body.venue;
    if (body.matchType !== undefined) updateData.match_type = body.matchType;

    const { data: updatedMatchDay, error } = await supabaseAdmin
      .from('match_days')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update match day error:', error);
      return errorResponse('Failed to update match day', 500);
    }

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

    const { error } = await supabaseAdmin
      .from('match_days')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete match day error:', error);
      return errorResponse('Failed to delete match day', 500);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Delete match day error:', error);
    return errorResponse('Internal server error', 500);
  }
}

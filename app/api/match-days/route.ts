import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthUser, unauthorizedResponse, successResponse, errorResponse } from '@/lib/auth-utils';
import { CreateMatchDayRequest } from '@/lib/types';

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

    // Check if match day already exists for this date
    const { data: existingMatch } = await supabaseAdmin
      .from('match_days')
      .select('id')
      .eq('match_date', matchDate)
      .limit(1)
      .single();

    if (existingMatch) {
      return errorResponse('Match day already exists for this date', 400);
    }

    const { data: matchDay, error } = await supabaseAdmin
      .from('match_days')
      .insert({
        match_date: matchDate,
        opponent: opponent || null,
        venue: venue || null,
        match_type: matchType,
      })
      .select()
      .single();

    if (error) {
      console.error('Create match day error:', error);
      return errorResponse('Failed to create match day', 500);
    }

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

    const { data: matchDays, error } = await supabaseAdmin
      .from('match_days')
      .select('*')
      .order('match_date', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) {
      console.error('Get match days error:', error);
      return errorResponse('Failed to fetch match days', 500);
    }

    const mappedMatchDays = (matchDays || []).map((matchDay: any) => ({
      id: matchDay.id,
      matchDate: matchDay.match_date,
      opponent: matchDay.opponent,
      venue: matchDay.venue,
      matchType: matchDay.match_type,
      createdAt: matchDay.created_at,
    }));

    return successResponse(mappedMatchDays);
  } catch (error) {
    console.error('Get match days error:', error);
    return errorResponse('Internal server error', 500);
  }
}

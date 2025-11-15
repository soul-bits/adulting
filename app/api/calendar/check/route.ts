/**
 * Quick Calendar Check Route
 * 
 * GET /api/calendar/check?accessToken=TOKEN
 * Quick endpoint to check current events without full conversion
 * Useful for testing if events are being fetched
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClient, fetchCalendarEvents } from '@/lib/integrations/google-calendar';
import { env } from '@/lib/config/env';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let accessToken: string | null = searchParams.get('accessToken');
    let refreshToken: string | undefined = searchParams.get('refreshToken') || undefined;

    // If no token provided, try to use environment variables
    if (!accessToken) {
      accessToken = env.googleCalendar.accessToken || null;
      refreshToken = env.googleCalendar.refreshToken || undefined;
    }

    if (!accessToken) {
      return NextResponse.json(
        { 
          error: 'Access token is required',
          message: 'Either provide ?accessToken=YOUR_TOKEN in the URL, or set GOOGLE_ACCESS_TOKEN in .env.local',
          example: '/api/calendar/check?accessToken=YOUR_TOKEN'
        },
        { status: 401 }
      );
    }

    console.log('[Quick Check] Fetching events...');
    const calendarClient = getCalendarClient(accessToken, refreshToken);
    const googleEvents = await fetchCalendarEvents(calendarClient);
    
    // Return raw event info for quick checking
    const eventSummary = googleEvents.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled',
      start: event.start?.dateTime || event.start?.date,
      location: event.location || 'No location',
      created: event.created,
      updated: event.updated,
    }));

    console.log(`[Quick Check] Found ${googleEvents.length} events`);
    console.log(`[Quick Check] Event titles:`, eventSummary.map(e => e.title).join(', '));

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      totalEvents: googleEvents.length,
      events: eventSummary,
      message: googleEvents.length > 0 
        ? `Found ${googleEvents.length} event(s) in your calendar`
        : 'No events found in the next 30 days',
    });
  } catch (error) {
    console.error('[Quick Check] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check calendar',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Make sure your access token is valid and not expired'
      },
      { status: 500 }
    );
  }
}


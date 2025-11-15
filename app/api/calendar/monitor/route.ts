/**
 * Calendar Monitor Route
 * 
 * GET /api/calendar/monitor
 * Manually trigger a check for calendar events (for testing)
 * 
 * POST /api/calendar/monitor
 * NOTE: Background monitoring is disabled. Calendar events are fetched only by the UI
 * every 5 minutes. This endpoint is kept for manual testing but does not start background polling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClient, fetchCalendarEvents, convertGoogleEventToEventType } from '@/lib/integrations/google-calendar';
import { EventType } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken') || undefined;

    if (!accessToken) {
      return NextResponse.json(
        { 
          error: 'Access token is required',
          message: 'Please authenticate first by visiting /api/calendar/auth',
        },
        { status: 401 }
      );
    }

    console.log('[Monitor] Manual check triggered');
    
    // Do a one-time check
    const calendarClient = getCalendarClient(accessToken, refreshToken);
    const googleEvents = await fetchCalendarEvents(calendarClient);
    
    const events: EventType[] = googleEvents
      .map(googleEvent => {
        const partial = convertGoogleEventToEventType(googleEvent);
        if (partial.id && partial.title && partial.date) {
          return {
            ...partial,
            type: 'other' as const,
            status: 'pending' as const,
            tasks: [],
          } as EventType;
        }
        return null;
      })
      .filter((e): e is EventType => e !== null);

    console.log(`[Monitor] Found ${events.length} events`);

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      eventCount: events.length,
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        date: e.date.toISOString(),
        location: e.location,
      })),
    });
  } catch (error) {
    console.error('[Monitor] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check calendar',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Background monitoring is disabled - UI handles all calendar fetching
  return NextResponse.json({
    success: false,
    message: 'Background monitoring is disabled. Calendar events are fetched only by the UI every 5 minutes.',
    note: 'Use GET /api/calendar/monitor for manual testing, or let the UI handle automatic fetching.',
  }, { status: 200 });
}


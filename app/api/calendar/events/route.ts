/**
 * API Route: Calendar Events
 * 
 * GET /api/calendar/events
 * Fetches events from Google Calendar
 * 
 * POST /api/calendar/events
 * Creates a new calendar event
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClient, fetchCalendarEvents, createCalendarEvent, convertGoogleEventToEventType } from '@/lib/integrations/google-calendar';
import { mergeEventsHistory } from '@/lib/storage/event-history';
import { EventType } from '@/lib/types';
import { env } from '@/lib/config/env';

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
          authUrl: '/api/calendar/auth'
        },
        { status: 401 }
      );
    }

    console.log('[Calendar API] Fetching events with access token...');
    const calendarClient = getCalendarClient(accessToken, refreshToken);
    const googleEvents = await fetchCalendarEvents(calendarClient);
    
    console.log(`[Calendar API] Fetched ${googleEvents.length} events from Google Calendar`);

    // Convert to our format
    const events: EventType[] = googleEvents
      .map(googleEvent => {
        const partial = convertGoogleEventToEventType(googleEvent);
        if (partial.id && partial.title && partial.date) {
          console.log(`[Calendar API] Converting event: ${partial.title} (${partial.date.toISOString()})`);
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

    console.log(`[Calendar API] Successfully converted ${events.length} events`);
    console.log(`[Calendar API] Event titles:`, events.map(e => e.title).join(', '));

    // Merge stored event history (tasks, planning status, etc.)
    console.log(`[Calendar API] Loading stored event history...`);
    const eventsWithHistory = await mergeEventsHistory(events);
    console.log(`[Calendar API] ✅ Merged event history for ${eventsWithHistory.length} event(s)`);

    return NextResponse.json({
      success: true,
      count: eventsWithHistory.length,
      events: eventsWithHistory,
      rawGoogleEvents: googleEvents.length, // For debugging
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant') || error.message.includes('token')) {
        return NextResponse.json(
          { 
            error: 'Authentication token expired or invalid',
            message: 'Please re-authenticate by visiting /api/calendar/auth',
            authUrl: '/api/calendar/auth'
          },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch calendar events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, refreshToken, eventData } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 401 }
      );
    }

    if (!eventData || !eventData.summary) {
      return NextResponse.json(
        { error: 'Event data is required' },
        { status: 400 }
      );
    }

    const calendarClient = getCalendarClient(accessToken, refreshToken);
    const createdEvent = await createCalendarEvent(calendarClient, eventData);

    return NextResponse.json({
      success: true,
      event: createdEvent,
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create calendar event',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


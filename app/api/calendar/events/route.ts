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
          authUrl: '/api/calendar/auth'
        },
        { status: 401 }
      );
    }

    const calendarClient = getCalendarClient(accessToken, refreshToken);
    const googleEvents = await fetchCalendarEvents(calendarClient);

    // Convert to our format
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

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
      rawGoogleEvents: googleEvents.length, // For debugging
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


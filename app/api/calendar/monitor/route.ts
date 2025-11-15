/**
 * Calendar Monitor Route
 * 
 * GET /api/calendar/monitor
 * Manually trigger a check for calendar events (for testing)
 * 
 * POST /api/calendar/monitor
 * Start monitoring calendar events with polling
 */

import { NextRequest, NextResponse } from 'next/server';
import { CalendarEventWatcher } from '@/lib/calendar/event-watcher';
import { getCalendarClient, fetchCalendarEvents, convertGoogleEventToEventType } from '@/lib/integrations/google-calendar';
import { EventType } from '@/lib/types';

// Store watcher instances (in production, use a proper store like Redis or database)
const watchers = new Map<string, CalendarEventWatcher>();

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
  try {
    const body = await request.json();
    const { accessToken, refreshToken, userId } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 401 }
      );
    }

    const userKey = userId || 'default';

    // Stop existing watcher if any
    if (watchers.has(userKey)) {
      watchers.get(userKey)?.stop();
      watchers.delete(userKey);
      console.log(`[Monitor] Stopped existing watcher for ${userKey}`);
    }

    // Create new watcher
    const watcher = new CalendarEventWatcher(
      accessToken,
      refreshToken,
      async (events) => {
        console.log('\n' + '='.repeat(80));
        console.log(`[Monitor] 🎯 NEW EVENTS DETECTED! Found ${events.length} event(s)`);
        console.log('='.repeat(80));
        events.forEach((event, index) => {
          console.log(`\n[Monitor] Event ${index + 1}:`);
          console.log(`  📅 Title: "${event.title}"`);
          console.log(`  🕐 Date: ${event.date.toISOString()}`);
          console.log(`  📍 Location: ${event.location || '(No location)'}`);
          console.log(`  🆔 ID: ${event.id}`);
        });
        console.log('\n' + '='.repeat(80) + '\n');
        // In production, you'd trigger event analysis here
      },
      5 * 60 * 1000 // 5 minutes - safe from rate limits (Google: 100 req/100 sec per user)
    );

    await watcher.start();
    watchers.set(userKey, watcher);

    console.log(`[Monitor] Started monitoring for ${userKey}`);

    return NextResponse.json({
      success: true,
      message: 'Monitoring started',
      pollInterval: '5 minutes',
      userId: userKey,
    });
  } catch (error) {
    console.error('[Monitor] Error starting monitor:', error);
    return NextResponse.json(
      { 
        error: 'Failed to start monitoring',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


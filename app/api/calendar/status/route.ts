/**
 * Calendar Monitor Status Route
 * 
 * GET /api/calendar/status
 * Check the status of calendar monitoring and recent events
 */

import { NextResponse } from 'next/server';
import { getWatcher } from '@/lib/calendar/monitor-init';
import { env } from '@/lib/config/env';
import { getCalendarClient, fetchCalendarEvents } from '@/lib/integrations/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const watcher = getWatcher();
    const hasAccessToken = !!env.googleCalendar.accessToken;
    const hasRefreshToken = !!env.googleCalendar.refreshToken;

    const status = {
      monitoring: {
        active: !!watcher,
        status: watcher ? 'running' : 'stopped',
        pollInterval: watcher ? '5 minutes' : null,
      },
      credentials: {
        accessToken: hasAccessToken ? 'set' : 'not set',
        refreshToken: hasRefreshToken ? 'set' : 'not set',
      },
      instructions: [] as string[],
    };

    // Try to fetch recent events if we have credentials
    let recentEvents = null;
    if (hasAccessToken) {
      try {
        const calendarClient = getCalendarClient(
          env.googleCalendar.accessToken!,
          env.googleCalendar.refreshToken
        );
        const googleEvents = await fetchCalendarEvents(calendarClient, undefined, undefined, 10);
        recentEvents = googleEvents.map(event => ({
          id: event.id,
          title: event.summary || 'Untitled',
          start: event.start?.dateTime || event.start?.date,
          location: event.location || 'No location',
          created: event.created,
          updated: event.updated,
        }));
      } catch (error) {
        status.instructions.push(`Error fetching events: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add instructions based on status
    if (!hasAccessToken) {
      status.instructions.push('Set GOOGLE_ACCESS_TOKEN in .env.local to enable monitoring');
    } else if (!watcher) {
      status.instructions.push('Restart the server or call /api/calendar/init to start monitoring');
    } else {
      status.instructions.push('Monitoring is active - check server logs for detected events');
      status.instructions.push('New events will be detected within 5 minutes of creation');
    }

    return NextResponse.json({
      success: true,
      ...status,
      recentEvents: recentEvents ? {
        count: recentEvents.length,
        events: recentEvents,
      } : null,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


/**
 * Calendar Monitor Initialization Route
 * 
 * GET /api/calendar/init
 * Initializes calendar monitoring on app startup
 * This route can be called automatically or manually to start monitoring
 */

import { NextResponse } from 'next/server';
import { initializeCalendarMonitoring, getWatcher } from '@/lib/calendar/monitor-init';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if already running
    const existingWatcher = getWatcher();
    if (existingWatcher) {
      return NextResponse.json({
        success: true,
        message: 'Calendar monitoring is already running',
        status: 'active',
        pollInterval: '5 minutes',
        note: 'Monitoring checks for new events every 5 minutes. Check server logs for detected events.',
      });
    }

    // Initialize monitoring
    const started = await initializeCalendarMonitoring();

    if (started) {
      return NextResponse.json({
        success: true,
        message: 'Calendar monitoring started successfully',
        status: 'active',
        pollInterval: '5 minutes',
        note: 'Monitoring will check for new events every 5 minutes',
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Calendar monitoring not started',
        reason: 'GOOGLE_ACCESS_TOKEN not set in environment variables',
        instructions: [
          '1. Set GOOGLE_ACCESS_TOKEN in your .env.local file',
          '2. Optionally set GOOGLE_REFRESH_TOKEN for token refresh',
          '3. Restart the server or call this endpoint again',
        ],
      }, { status: 400 });
    }
  } catch (error) {
    console.error('[Init Route] Error initializing monitoring:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initialize calendar monitoring',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


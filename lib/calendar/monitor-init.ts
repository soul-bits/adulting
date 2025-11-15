/**
 * Calendar Monitor Initialization
 * 
 * Automatically starts calendar event monitoring on app startup
 * using credentials from environment variables.
 */

import { CalendarEventWatcher } from './event-watcher';
import { env } from '@/lib/config/env';

// Store watcher instance globally (in production, use Redis or database)
let globalWatcher: CalendarEventWatcher | null = null;

/**
 * Start calendar monitoring if credentials are available
 * This should be called on app startup
 */
export async function initializeCalendarMonitoring(): Promise<boolean> {
  const accessToken = env.googleCalendar.accessToken;
  const refreshToken = env.googleCalendar.refreshToken;

  if (!accessToken) {
    console.log('[Monitor Init] ⚠️  GOOGLE_ACCESS_TOKEN not set. Calendar monitoring disabled.');
    console.log('[Monitor Init] Set GOOGLE_ACCESS_TOKEN in .env.local to enable automatic monitoring.');
    return false;
  }

  // Stop existing watcher if any
  if (globalWatcher) {
    console.log('[Monitor Init] Stopping existing watcher...');
    globalWatcher.stop();
    globalWatcher = null;
  }

  try {
    console.log('[Monitor Init] 🚀 Starting calendar event monitoring...');
    console.log('[Monitor Init] Polling interval: 5 minutes (safe from rate limits)');

    // Create watcher with 5 minute polling interval (300000ms)
    // Google Calendar API rate limit: 100 requests per 100 seconds per user
    // 5 minutes = 300 seconds, so we're well within limits
    const watcher = new CalendarEventWatcher(
      accessToken,
      refreshToken,
      async (events) => {
        // NOTE: This callback only logs detected events.
        // Planning/processing is ONLY triggered by the UI when it fetches events.
        // This ensures planning happens only when the user sees the events.
        console.log('\n' + '='.repeat(80));
        console.log(`[Monitor] 🎯 NEW EVENTS DETECTED! Found ${events.length} event(s)`);
        console.log('[Monitor] ℹ️  Events logged. Planning will occur when UI fetches events.');
        console.log('='.repeat(80));
        events.forEach((event, index) => {
          console.log(`\n[Monitor] Event ${index + 1}:`);
          console.log(`  📅 Title: "${event.title}"`);
          console.log(`  🕐 Date: ${event.date.toISOString()}`);
          console.log(`  📍 Location: ${event.location || '(No location)'}`);
          console.log(`  🆔 ID: ${event.id}`);
        });
        console.log('\n' + '='.repeat(80) + '\n');
      },
      5 * 60 * 1000 // 5 minutes - safe from rate limits
    );

    await watcher.start();
    globalWatcher = watcher;

    console.log('[Monitor Init] ✅ Calendar monitoring started successfully!');
    console.log('[Monitor Init] Listening for new calendar events...');
    return true;
  } catch (error) {
    console.error('[Monitor Init] ❌ Failed to start calendar monitoring:', error);
    return false;
  }
}

/**
 * Stop calendar monitoring
 */
export function stopCalendarMonitoring(): void {
  if (globalWatcher) {
    console.log('[Monitor Init] Stopping calendar monitoring...');
    globalWatcher.stop();
    globalWatcher = null;
    console.log('[Monitor Init] Calendar monitoring stopped.');
  }
}

/**
 * Get the current watcher instance (for status checks)
 */
export function getWatcher(): CalendarEventWatcher | null {
  return globalWatcher;
}


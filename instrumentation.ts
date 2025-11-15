/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts.
 * 
 * NOTE: Calendar monitoring is disabled. Calendar events are fetched only by the UI
 * every 5 minutes. Planning agents only work when events are shown in the UI.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Calendar monitoring disabled - UI handles all fetching
    console.log('[Instrumentation] ℹ️  Calendar monitoring disabled. UI handles all calendar fetching.');
    console.log('[Instrumentation] Calendar events are fetched every 5 minutes by the frontend.');
  }
}


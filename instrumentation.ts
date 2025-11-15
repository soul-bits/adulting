/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts.
 * We use it to automatically initialize calendar monitoring.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on server-side
    const { initializeCalendarMonitoring } = await import('./lib/calendar/monitor-init');
    
    // Small delay to ensure environment is fully loaded
    setTimeout(async () => {
      console.log('\n' + '='.repeat(80));
      console.log('[Instrumentation] 🚀 Initializing calendar monitoring...');
      console.log('='.repeat(80));
      
      await initializeCalendarMonitoring();
      
      console.log('='.repeat(80) + '\n');
    }, 1000);
  }
}


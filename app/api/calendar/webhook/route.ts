/**
 * Calendar Webhook Handler
 * 
 * POST /api/calendar/webhook
 * Receives webhook notifications from Google Calendar when events change
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClient, fetchCalendarEvents, convertGoogleEventToEventType } from '@/lib/integrations/google-calendar';
import { EventType } from '@/lib/types';
import { analyzeEvent } from '@/lib/agent/event-analyzer';
import { generateQuestions } from '@/lib/agent/question-generator';
import { generateTasks } from '@/lib/agent/task-planner';

export const dynamic = 'force-dynamic';

/**
 * Helper function to calculate duration
 */
function calculateDuration(start: any, end: any): string {
  if (!start || !end) return 'N/A';
  
  const startTime = new Date(start.dateTime || start.date);
  const endTime = new Date(end.dateTime || end.date);
  const durationMs = endTime.getTime() - startTime.getTime();
  
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Helper function to format date/time
 */
function formatDateTime(dateTime?: string | null, date?: string | null): string {
  if (dateTime) {
    const dt = new Date(dateTime);
    return dt.toLocaleString();
  }
  if (date) {
    const d = new Date(date);
    return d.toLocaleDateString();
  }
  return 'N/A';
}

export async function POST(request: NextRequest) {
  // Google expects a fast 200 OK response
  // We'll process the webhook asynchronously
  
  const headers = request.headers;
  const state = headers.get('x-goog-resource-state');
  const channelId = headers.get('x-goog-channel-id');
  const resourceId = headers.get('x-goog-resource-id');

  console.log('\n' + '='.repeat(60));
  console.log('[Webhook] 📅 Calendar webhook received!');
  console.log(`[Webhook] State: ${state}`);
  console.log(`[Webhook] Channel ID: ${channelId}`);
  console.log(`[Webhook] Resource ID: ${resourceId}`);
  console.log('='.repeat(60));

  // Respond immediately to Google
  const response = NextResponse.json({ received: true });

  // Process webhook asynchronously
  if (state === 'exists' || state === 'sync' || state === 'change') {
    // Process in background (don't await)
    processWebhookNotification(state, channelId, resourceId).catch(error => {
      console.error('[Webhook] Error processing notification:', error);
    });
  }

  return response;
}

async function processWebhookNotification(
  state: string | null,
  channelId: string | null,
  resourceId: string | null
) {
  try {
    console.log(`[Webhook] Processing ${state} notification...`);
    console.log(`[Webhook] Channel ID: ${channelId}`);
    console.log(`[Webhook] Resource ID: ${resourceId}\n`);

    // Note: In a real app, you'd retrieve the access token from storage
    // For now, we'll need to get it from the request or store it
    // This is a limitation - we need the access token to fetch events
    
    console.log('[Webhook] ⚠️  Note: To fetch events, we need the access token.');
    console.log('[Webhook] Store access tokens securely and retrieve them here.');
    console.log('[Webhook] For now, webhook is received but event fetching requires token.\n');

    // TODO: Retrieve access token from storage (database, Redis, etc.)
    // const accessToken = await getStoredAccessToken(userId);
    // const calendarClient = getCalendarClient(accessToken);
    // const googleEvents = await fetchCalendarEvents(calendarClient);
    
    // For demonstration, log what we would do:
    console.log('[Webhook] Would fetch events and process them here...');
    console.log('[Webhook] Would analyze events with AI...');
    console.log('[Webhook] Would generate questions and tasks...\n');

  } catch (error) {
    console.error('[Webhook] ❌ Error processing webhook:', error);
  }
}

/**
 * Process webhook with access token (called from authenticated context)
 * Note: This is a helper function, not exported as a route handler
 */
async function processWebhookWithToken(
  accessToken: string,
  refreshToken: string | undefined,
  state: string | null
) {
  try {
    console.log('[Webhook] Fetching events after webhook notification...');
    
    const calendarClient = getCalendarClient(accessToken, refreshToken);
    
    // Get recent events (last 24 hours and upcoming)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const googleEvents = await fetchCalendarEvents(calendarClient, yesterday, future, 20);
    
    console.log(`[Webhook] 📋 Found ${googleEvents.length} events (recent and upcoming)\n`);

    // Process each event
    for (const googleEvent of googleEvents) {
      console.log('='.repeat(60));
      console.log(`Event: ${googleEvent.summary || '(No title)'}`);
      console.log(`Description: ${googleEvent.description || '(No description)'}`);
      console.log(`Start Time: ${formatDateTime(googleEvent.start?.dateTime, googleEvent.start?.date)}`);
      console.log(`End Time: ${formatDateTime(googleEvent.end?.dateTime, googleEvent.end?.date)}`);
      console.log(`Duration: ${calculateDuration(googleEvent.start, googleEvent.end)}`);
      console.log(`Location: ${googleEvent.location || '(No location)'}`);
      console.log(`Status: ${googleEvent.status || 'N/A'}`);
      console.log(`Event ID: ${googleEvent.id || 'N/A'}`);
      
      if (googleEvent.attendees && googleEvent.attendees.length > 0) {
        console.log(`Attendees: ${googleEvent.attendees.map(a => a.email).join(', ')}`);
      }
      
      // Convert to our format
      const partial = convertGoogleEventToEventType(googleEvent);
      if (partial.id && partial.title && partial.date) {
        const event: EventType = {
          id: partial.id,
          title: partial.title,
          date: partial.date,
          type: 'other',
          status: 'pending',
          tasks: [],
          location: partial.location,
          participants: partial.participants,
        };

        console.log(`\n[Webhook] 🎯 Processing event: "${event.title}"`);
        
        // Analyze the event
        try {
          console.log('[Webhook] Analyzing event with AI...');
          const analysis = await analyzeEvent(event);
          console.log(`[Webhook] Event type: ${analysis.eventType}`);
          console.log(`[Webhook] Context: ${analysis.context}`);
          console.log(`[Webhook] Required actions: ${analysis.requiredActions.join(', ')}`);
          console.log(`[Webhook] Missing info: ${analysis.missingInfo.join(', ')}`);

          // Generate questions
          if (analysis.missingInfo.length > 0) {
            console.log('[Webhook] Generating clarifying questions...');
            const questions = await generateQuestions(event, analysis.missingInfo);
            console.log(`[Webhook] Questions: ${questions.filter(q => q).join(' | ')}`);
          }

          // Generate tasks
          console.log('[Webhook] Generating tasks...');
          const tasks = await generateTasks(event, {});
          console.log(`[Webhook] Generated ${tasks.length} tasks`);
          tasks.forEach(task => {
            console.log(`[Webhook]   - ${task.title} (${task.category})`);
          });
        } catch (error) {
          console.error('[Webhook] Error processing event:', error);
        }
      }
      
      console.log('='.repeat(60) + '\n');
    }

    console.log('[Webhook] ✅ Event processing complete\n');
  } catch (error) {
    console.error('[Webhook] ❌ Error fetching events:', error);
    throw error;
  }
}


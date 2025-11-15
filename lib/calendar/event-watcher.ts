/**
 * Calendar Event Watcher
 * 
 * Monitors Google Calendar for new or updated events and triggers analysis.
 * Can be used with polling or webhooks (push notifications).
 */

import { EventType } from '@/lib/types';
import { fetchCalendarEvents, getCalendarClient, convertGoogleEventToEventType } from '@/lib/integrations/google-calendar';

type EventChangeCallback = (events: EventType[]) => Promise<void>;

/**
 * Poll calendar for events and detect changes
 * @param accessToken - OAuth2 access token
 * @param refreshToken - OAuth2 refresh token
 * @param onEventsChanged - Callback when events change
 * @param pollInterval - Polling interval in milliseconds (default: 5 minutes)
 */
export class CalendarEventWatcher {
  private accessToken: string;
  private refreshToken?: string;
  private onEventsChanged: EventChangeCallback;
  private pollInterval: number;
  private intervalId?: NodeJS.Timeout;
  private lastEventIds: Set<string> = new Set();

  constructor(
    accessToken: string,
    refreshToken: string | undefined,
    onEventsChanged: EventChangeCallback,
    pollInterval: number = 5 * 60 * 1000 // 5 minutes default
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.onEventsChanged = onEventsChanged;
    this.pollInterval = pollInterval;
  }

  /**
   * Start watching for calendar changes
   */
  async start() {
    // Initial fetch
    await this.checkForChanges();

    // Set up polling
    this.intervalId = setInterval(() => {
      this.checkForChanges().catch(console.error);
    }, this.pollInterval);
  }

  /**
   * Stop watching for calendar changes
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Check for new or updated events
   */
  private async checkForChanges() {
    try {
      console.log('[Event Watcher] Checking for calendar changes...');
      console.log(`[Event Watcher] Last seen ${this.lastEventIds.size} events`);
      
      const calendarClient = getCalendarClient(this.accessToken, this.refreshToken);
      const googleEvents = await fetchCalendarEvents(calendarClient);
      
      const currentEventIds = new Set(googleEvents.map(e => e.id).filter(Boolean) as string[]);
      
      console.log(`[Event Watcher] Current events: ${currentEventIds.size}`);
      
      // Check if there are new events or if event count changed
      const hasNewEvents = currentEventIds.size !== this.lastEventIds.size ||
        Array.from(currentEventIds).some(id => !this.lastEventIds.has(id));

      if (hasNewEvents) {
        const newEventIds = Array.from(currentEventIds).filter(id => !this.lastEventIds.has(id));
        console.log(`[Event Watcher] 🎉 NEW EVENTS DETECTED! Found ${newEventIds.length} new event(s)`);
        console.log(`[Event Watcher] New event IDs:`, newEventIds);
        
        // Convert Google events to our format and filter to only new events
        const allEvents: EventType[] = googleEvents
          .map(googleEvent => {
            const partial = convertGoogleEventToEventType(googleEvent);
            // Only include if we have required fields
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

        // Filter to only new events for the callback
        const newEvents = allEvents.filter(event => !this.lastEventIds.has(event.id));
        
        newEvents.forEach(event => {
          console.log(`[Event Watcher] ✨ NEW EVENT: "${event.title}" on ${event.date.toISOString()}`);
        });

        // Update last seen event IDs
        this.lastEventIds = currentEventIds;
        console.log(`[Event Watcher] Updated last seen events. Total: ${this.lastEventIds.size}`);

        // Trigger callback with only new events
        console.log(`[Event Watcher] Triggering onEventsChanged callback with ${newEvents.length} new event(s)`);
        await this.onEventsChanged(newEvents);
        console.log(`[Event Watcher] Callback completed successfully`);
      } else {
        console.log(`[Event Watcher] No new events detected`);
      }
    } catch (error) {
      console.error('[Event Watcher] ❌ Error checking for calendar changes:', error);
      
      // Check if it's an authentication error
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('invalid_grant') || 
            errorMessage.includes('token') || 
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('401')) {
          console.error('[Event Watcher] ⚠️  Authentication error - token may be expired');
          console.error('[Event Watcher] Please refresh your access token and restart monitoring');
        }
      }
      
      // Don't throw - continue polling (token refresh can be handled externally)
      // The error will be logged but monitoring will continue
    }
  }

  /**
   * Update access token (useful when token is refreshed)
   */
  updateAccessToken(newAccessToken: string) {
    this.accessToken = newAccessToken;
  }
}

/**
 * Process a webhook notification from Google Calendar
 * @param notification - Webhook notification data
 */
export function processWebhookNotification(notification: any) {
  // Google Calendar sends webhook notifications when events change
  // This would be called from an API route that receives webhook POST requests
  // For now, this is a placeholder for webhook processing
  return {
    eventId: notification.resourceId,
    changeType: notification.changeType, // 'created', 'updated', 'deleted'
  };
}


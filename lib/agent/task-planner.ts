/**
 * Task Planner - Simplified Version
 * 
 * Generates ONLY 3 fixed tasks for birthday events:
 * 1. Order dress for niece
 * 2. Book venue
 * 3. Send invitations
 */

import { EventType, Task } from '@/lib/types';
import { analyzeEvent } from './event-analyzer';

/**
 * Generate tasks for a birthday event - ONLY 3 tasks
 * @param event - Event to generate tasks for
 * @param questionResponses - User responses (not used for simplified version)
 */
export async function generateTasks(
  event: Partial<EventType>,
  questionResponses: Record<string, string> = {}
): Promise<Task[]> {
  // Analyze the event to verify it's a birthday
  const analysis = await analyzeEvent(event);

  // Only generate tasks for birthday events
  if (analysis.eventType !== 'birthday') {
    console.log(`[Task Planner] Event is not a birthday event, skipping task generation`);
    return [];
  }

  // Generate the 3 fixed tasks for birthday event planning
  const tasks: Task[] = [
    {
      id: `task-birthday-dress-${Date.now()}-0`,
      eventId: event.id || '',
      category: 'shopping',
      title: 'Order dress for niece',
      description: 'Order a beautiful dress for your niece from online retailers. Auto-fetch recommendations using browser automation.',
      status: 'suggested',
      needsApproval: true,
    },
    {
      id: `task-birthday-venue-${Date.now()}-1`,
      eventId: event.id || '',
      category: 'booking',
      title: 'Book venue',
      description: 'Book a suitable venue for the birthday party. Get venue recommendations using AI.',
      status: 'suggested',
      needsApproval: true,
    },
    {
      id: `task-birthday-invites-${Date.now()}-2`,
      eventId: event.id || '',
      category: 'communication',
      title: 'Send invitations',
      description: 'Send birthday invitations to all guests with RSVP and event details. Get communication tool recommendations.',
      status: 'suggested',
      needsApproval: false,
    },
  ];

  console.log(`[Task Planner] ✅ Generated 3 birthday tasks for event: "${event.title}"`);
  return tasks;
}

/**
 * Update event with generated tasks
 * @param event - Event to update
 * @param tasks - Generated tasks
 */
export function updateEventWithTasks(event: EventType, tasks: Task[]): EventType {
  return {
    ...event,
    tasks: [...event.tasks, ...tasks],
  };
}


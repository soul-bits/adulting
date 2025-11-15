/**
 * Task Planner
 * 
 * Generates appropriate tasks based on event analysis and user responses to questions.
 * Tasks are determined dynamically by AI based on event type and context.
 */

import { EventType, Task } from '@/lib/types';
import { analyzeEvent, determineTaskCategories } from './event-analyzer';

/**
 * Generate tasks for an event based on analysis and question responses
 * @param event - Event to generate tasks for
 * @param questionResponses - User responses to clarifying questions (key-value pairs)
 */
export async function generateTasks(
  event: Partial<EventType>,
  questionResponses: Record<string, string> = {}
): Promise<Task[]> {
  // Analyze the event
  const analysis = await analyzeEvent(event);

  // Determine task categories based on analysis
  const taskTemplates = determineTaskCategories(event, analysis);

  // Generate tasks with unique IDs
  const tasks: Task[] = taskTemplates.map((template, index) => {
    // Determine if task needs approval based on category
    const needsApproval = template.category === 'shopping' || template.category === 'booking';

    return {
      id: `task-${Date.now()}-${index}`,
      eventId: event.id || '',
      category: template.category,
      title: template.title,
      description: template.description,
      status: 'suggested',
      needsApproval,
      suggestions: [], // Suggestions will be generated separately if needed
    };
  });

  // Add context-specific tasks based on event type
  const additionalTasks = generateContextSpecificTasks(event, analysis, questionResponses);
  tasks.push(...additionalTasks);

  return tasks;
}

/**
 * Generate context-specific tasks based on event type and responses
 */
function generateContextSpecificTasks(
  event: Partial<EventType>,
  analysis: Awaited<ReturnType<typeof analyzeEvent>>,
  questionResponses: Record<string, string>
): Task[] {
  const tasks: Task[] = [];

  // Birthday-specific tasks
  if (analysis.eventType === 'birthday') {
    const guestCount = questionResponses['number of guests'] || questionResponses['guests'] || 'unknown';
    
    tasks.push({
      id: `task-birthday-cake-${Date.now()}`,
      eventId: event.id || '',
      category: 'shopping',
      title: 'Order Birthday Cake',
      description: `Order a birthday cake for ${guestCount} guests`,
      status: 'suggested',
      needsApproval: true,
    });

    tasks.push({
      id: `task-birthday-invites-${Date.now()}`,
      eventId: event.id || '',
      category: 'communication',
      title: 'Send Birthday Invitations',
      description: `Send invitations to ${guestCount} guests with RSVP form`,
      status: 'suggested',
      needsApproval: true,
    });
  }

  // Meeting/conference-specific tasks
  if (analysis.eventType === 'meeting' || analysis.eventType === 'conference') {
    tasks.push({
      id: `task-meeting-prep-${Date.now()}`,
      eventId: event.id || '',
      category: 'preparation',
      title: 'Prepare Meeting Materials',
      description: 'Prepare agenda, slides, and handouts for the meeting',
      status: 'suggested',
      needsApproval: false,
    });
  }

  // Dinner-specific tasks
  if (analysis.eventType === 'dinner') {
    tasks.push({
      id: `task-dinner-reservation-${Date.now()}`,
      eventId: event.id || '',
      category: 'booking',
      title: 'Make Restaurant Reservation',
      description: 'Reserve a table at the restaurant',
      status: 'suggested',
      needsApproval: true,
    });
  }

  // Travel-specific tasks
  if (analysis.eventType === 'travel') {
    tasks.push({
      id: `task-travel-booking-${Date.now()}`,
      eventId: event.id || '',
      category: 'booking',
      title: 'Book Travel Arrangements',
      description: 'Book flights, hotels, and transportation',
      status: 'suggested',
      needsApproval: true,
    });
  }

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


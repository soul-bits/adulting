/**
 * Event History Storage
 * 
 * Stores detailed information about what was done for each processed event.
 * This includes planning tasks, birthday agent tasks, and other processing details.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { EventType, Task } from '@/lib/types';

const EVENT_HISTORY_FILE = path.join(process.cwd(), 'data', 'event-history.json');

interface EventProcessingHistory {
  eventId: string;
  eventTitle: string;
  planningStatus: 'idle' | 'planning' | 'completed' | 'error';
  planningTasks: Task[];
  birthdayAgentTask?: Task;
  processedAt: string;
  lastUpdated: string;
}

interface EventHistoryData {
  events: Record<string, EventProcessingHistory>;
  lastUpdated: string;
}

/**
 * Ensure the data directory exists
 */
async function ensureDataDirectory(): Promise<void> {
  const dataDir = path.dirname(EVENT_HISTORY_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Read event history from file
 */
async function readEventHistory(): Promise<EventHistoryData> {
  try {
    await ensureDataDirectory();
    const fileContent = await fs.readFile(EVENT_HISTORY_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // File doesn't exist or is invalid, return empty data
    return {
      events: {},
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Write event history to file
 */
async function writeEventHistory(data: EventHistoryData): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(EVENT_HISTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Save planning tasks for an event
 */
export async function savePlanningTasks(
  eventId: string,
  eventTitle: string,
  tasks: Task[],
  planningStatus: 'planning' | 'completed' | 'error' = 'completed'
): Promise<void> {
  try {
    const history = await readEventHistory();
    const now = new Date().toISOString();
    
    if (!history.events[eventId]) {
      history.events[eventId] = {
        eventId,
        eventTitle,
        planningStatus: 'idle',
        planningTasks: [],
        processedAt: now,
        lastUpdated: now,
      };
    }
    
    history.events[eventId].planningTasks = tasks;
    history.events[eventId].planningStatus = planningStatus;
    history.events[eventId].eventTitle = eventTitle; // Update title in case it changed
    history.events[eventId].lastUpdated = now;
    history.lastUpdated = now;
    
    await writeEventHistory(history);
    console.log(`[Event History] ✅ Saved ${tasks.length} planning task(s) for event ${eventId}`);
  } catch (error) {
    console.error('[Event History] Error saving planning tasks:', error);
    throw error;
  }
}

/**
 * Save birthday agent task for an event
 */
export async function saveBirthdayAgentTask(
  eventId: string,
  eventTitle: string,
  task: Task
): Promise<void> {
  try {
    const history = await readEventHistory();
    const now = new Date().toISOString();
    
    if (!history.events[eventId]) {
      history.events[eventId] = {
        eventId,
        eventTitle,
        planningStatus: 'idle',
        planningTasks: [],
        processedAt: now,
        lastUpdated: now,
      };
    }
    
    history.events[eventId].birthdayAgentTask = task;
    history.events[eventId].eventTitle = eventTitle; // Update title in case it changed
    history.events[eventId].lastUpdated = now;
    history.lastUpdated = now;
    
    await writeEventHistory(history);
    console.log(`[Event History] ✅ Saved birthday agent task for event ${eventId}`);
  } catch (error) {
    console.error('[Event History] Error saving birthday agent task:', error);
    throw error;
  }
}

/**
 * Update planning status for an event
 */
export async function updatePlanningStatus(
  eventId: string,
  eventTitle: string,
  status: 'planning' | 'completed' | 'error'
): Promise<void> {
  try {
    const history = await readEventHistory();
    const now = new Date().toISOString();
    
    if (!history.events[eventId]) {
      history.events[eventId] = {
        eventId,
        eventTitle,
        planningStatus: status,
        planningTasks: [],
        processedAt: now,
        lastUpdated: now,
      };
    } else {
      history.events[eventId].planningStatus = status;
      history.events[eventId].eventTitle = eventTitle;
      history.events[eventId].lastUpdated = now;
    }
    
    history.lastUpdated = now;
    await writeEventHistory(history);
    console.log(`[Event History] ✅ Updated planning status for event ${eventId} to ${status}`);
  } catch (error) {
    console.error('[Event History] Error updating planning status:', error);
    throw error;
  }
}

/**
 * Get processing history for an event
 */
export async function getEventHistory(eventId: string): Promise<EventProcessingHistory | null> {
  try {
    const history = await readEventHistory();
    return history.events[eventId] || null;
  } catch (error) {
    console.error('[Event History] Error getting event history:', error);
    return null;
  }
}

/**
 * Get all event histories
 */
export async function getAllEventHistories(): Promise<Record<string, EventProcessingHistory>> {
  try {
    const history = await readEventHistory();
    return history.events;
  } catch (error) {
    console.error('[Event History] Error getting all event histories:', error);
    return {};
  }
}

/**
 * Merge stored history into an event
 * This restores tasks and planning status from storage
 */
export async function mergeEventHistory(event: EventType): Promise<EventType> {
  try {
    const history = await getEventHistory(event.id);
    
    if (!history) {
      return event;
    }
    
    // Merge planning tasks (avoid duplicates)
    const existingTaskIds = new Set(event.tasks.map(t => t.id));
    const planningTasks = history.planningTasks.filter(t => !existingTaskIds.has(t.id));
    
    // Merge birthday agent task (avoid duplicates)
    let birthdayTask = event.tasks.find(t => t.id.startsWith(`task-birthday-dress-${event.id}`));
    if (!birthdayTask && history.birthdayAgentTask) {
      birthdayTask = history.birthdayAgentTask;
    }
    
    // Combine all tasks
    const allTasks = [...event.tasks, ...planningTasks];
    if (birthdayTask && !allTasks.some(t => t.id === birthdayTask!.id)) {
      allTasks.push(birthdayTask);
    }
    
    // Merge planning status if not already set
    const planningStatus = event.planningStatus || history.planningStatus;
    
    return {
      ...event,
      tasks: allTasks,
      planningStatus: planningStatus !== 'idle' ? planningStatus : undefined,
    };
  } catch (error) {
    console.error('[Event History] Error merging event history:', error);
    return event;
  }
}

/**
 * Merge stored history into multiple events
 */
export async function mergeEventsHistory(events: EventType[]): Promise<EventType[]> {
  try {
    const histories = await getAllEventHistories();
    
    return events.map(event => {
      const history = histories[event.id];
      if (!history) {
        return event;
      }
      
      // Merge planning tasks
      const existingTaskIds = new Set(event.tasks.map(t => t.id));
      const planningTasks = history.planningTasks.filter(t => !existingTaskIds.has(t.id));
      
      // Merge birthday agent task
      let birthdayTask = event.tasks.find(t => t.id.startsWith(`task-birthday-dress-${event.id}`));
      if (!birthdayTask && history.birthdayAgentTask) {
        birthdayTask = history.birthdayAgentTask;
      }
      
      // Combine all tasks
      const allTasks = [...event.tasks, ...planningTasks];
      if (birthdayTask && !allTasks.some(t => t.id === birthdayTask!.id)) {
        allTasks.push(birthdayTask);
      }
      
      // Merge planning status
      const planningStatus = event.planningStatus || history.planningStatus;
      
      return {
        ...event,
        tasks: allTasks,
        planningStatus: planningStatus !== 'idle' ? planningStatus : undefined,
      };
    });
  } catch (error) {
    console.error('[Event History] Error merging events history:', error);
    return events;
  }
}

/**
 * Delete history for an event (useful for cleanup)
 */
export async function deleteEventHistory(eventId: string): Promise<void> {
  try {
    const history = await readEventHistory();
    delete history.events[eventId];
    history.lastUpdated = new Date().toISOString();
    await writeEventHistory(history);
    console.log(`[Event History] ✅ Deleted history for event ${eventId}`);
  } catch (error) {
    console.error('[Event History] Error deleting event history:', error);
    throw error;
  }
}


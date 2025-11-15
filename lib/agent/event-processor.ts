/**
 * Event Processor
 * 
 * Tracks which events have been processed to avoid duplicate processing
 * across app restarts. Uses a local JSON file for persistence.
 */

import { promises as fs } from 'fs';
import path from 'path';

const PROCESSED_EVENTS_FILE = path.join(process.cwd(), 'data', 'processed-events.json');

interface ProcessedEventsData {
  processedEventIds: string[];
  lastUpdated: string;
}

/**
 * Ensure the data directory exists
 */
async function ensureDataDirectory(): Promise<void> {
  const dataDir = path.dirname(PROCESSED_EVENTS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

/**
 * Read processed events from file
 */
async function readProcessedEvents(): Promise<ProcessedEventsData> {
  try {
    await ensureDataDirectory();
    const fileContent = await fs.readFile(PROCESSED_EVENTS_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // File doesn't exist or is invalid, return empty data
    return {
      processedEventIds: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Write processed events to file
 */
async function writeProcessedEvents(data: ProcessedEventsData): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(PROCESSED_EVENTS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Check if an event has already been processed
 * @param eventId - The event ID to check
 * @returns true if the event has been processed, false otherwise
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const data = await readProcessedEvents();
    return data.processedEventIds.includes(eventId);
  } catch (error) {
    console.error('[Event Processor] Error checking if event is processed:', error);
    return false;
  }
}

/**
 * Mark an event as processed
 * @param eventId - The event ID to mark as processed
 */
export async function markEventProcessed(eventId: string): Promise<void> {
  try {
    const data = await readProcessedEvents();
    
    if (!data.processedEventIds.includes(eventId)) {
      data.processedEventIds.push(eventId);
      data.lastUpdated = new Date().toISOString();
      await writeProcessedEvents(data);
      console.log(`[Event Processor] ✅ Marked event ${eventId} as processed`);
    }
  } catch (error) {
    console.error('[Event Processor] Error marking event as processed:', error);
    throw error;
  }
}

/**
 * Get all processed event IDs
 * @returns Array of processed event IDs
 */
export async function getProcessedEventIds(): Promise<string[]> {
  try {
    const data = await readProcessedEvents();
    return data.processedEventIds;
  } catch (error) {
    console.error('[Event Processor] Error getting processed event IDs:', error);
    return [];
  }
}

/**
 * Clear all processed events (useful for testing)
 */
export async function clearProcessedEvents(): Promise<void> {
  try {
    const data: ProcessedEventsData = {
      processedEventIds: [],
      lastUpdated: new Date().toISOString(),
    };
    await writeProcessedEvents(data);
    console.log('[Event Processor] Cleared all processed events');
  } catch (error) {
    console.error('[Event Processor] Error clearing processed events:', error);
    throw error;
  }
}


/**
 * Birthday Event Agent
 * 
 * Processes birthday events by:
 * 1. Extracting recipient information from event title using keyword matching
 * 2. Creating a task to order a dress/outfit for the recipient
 * 3. Using browser-use to search Amazon and add to cart
 * 4. Tracking task execution status
 */

import { EventType, Task } from '@/lib/types';
import { isEventProcessed, markEventProcessed } from './event-processor';
import { searchAmazonAndAddToCart } from './browser-actions';
import { analyzeEvent } from './event-analyzer';
import { saveBirthdayAgentTask } from '@/lib/storage/event-history';

/**
 * Extract recipient type from event title using keyword matching
 * 
 * @param title - Event title (e.g., "birthday event for daughter for 7-10 kids")
 * @returns Object with recipient type and product query
 */
function extractRecipientFromTitle(title: string): { recipient: string; productQuery: string; gender: 'girls' | 'boys' | 'neutral' } {
  const titleLower = title.toLowerCase();
  
  // Keywords for female recipients
  const femaleKeywords = ['daughter', 'niece', 'girl', 'girls'];
  // Keywords for male recipients
  const maleKeywords = ['son', 'nephew', 'boy', 'boys'];
  // Neutral keywords
  const neutralKeywords = ['child', 'kid', 'kids'];
  
  // Check for female recipients
  for (const keyword of femaleKeywords) {
    if (titleLower.includes(keyword)) {
      return {
        recipient: keyword,
        productQuery: 'girls dress',
        gender: 'girls',
      };
    }
  }
  
  // Check for male recipients
  for (const keyword of maleKeywords) {
    if (titleLower.includes(keyword)) {
      return {
        recipient: keyword,
        productQuery: 'boys outfit',
        gender: 'boys',
      };
    }
  }
  
  // Check for neutral/child keywords
  for (const keyword of neutralKeywords) {
    if (titleLower.includes(keyword)) {
      // Default to girls if neutral
      return {
        recipient: keyword,
        productQuery: 'girls dress',
        gender: 'girls',
      };
    }
  }
  
  // Default fallback
  return {
    recipient: 'child',
    productQuery: 'girls dress',
    gender: 'girls',
  };
}

/**
 * Process a birthday event
 * 
 * @param event - The birthday event to process
 * @param onTaskCreated - Callback when task is created (for UI updates)
 * @param onTaskUpdated - Callback when task is updated (for UI updates)
 */
// Track events currently being processed by birthday agent to prevent duplicate browser-use calls
const processingEvents = new Set<string>();

export async function processBirthdayEvent(
  event: EventType,
  onTaskCreated?: (task: Task) => void,
  onTaskUpdated?: (taskId: string, updates: Partial<Task>) => void
): Promise<void> {
  // CRITICAL: Check if this event is already being processed (prevents duplicate browser-use calls)
  if (processingEvents.has(event.id)) {
    console.log(`[Birthday Agent] ⚠️  Event ${event.id} is already being processed by birthday agent, skipping duplicate call`);
    return;
  }

  try {
    // Mark as being processed BEFORE any async operations
    processingEvents.add(event.id);
    console.log(`\n[Birthday Agent] 🎂 Processing birthday event: "${event.title}" (ID: ${event.id})`);
    
    // Check if birthday agent has already processed this event
    // Look for a task created by this agent (starts with "task-birthday-dress-")
    const birthdayTaskExists = event.tasks?.some(task => 
      task.id.startsWith(`task-birthday-dress-${event.id}`)
    );
    
    if (birthdayTaskExists) {
      console.log(`[Birthday Agent] ⏭️  Event ${event.id} already processed by birthday agent, skipping`);
      processingEvents.delete(event.id);
      return;
    }
    
    // Verify this is actually a birthday event
    const analysis = await analyzeEvent(event);
    if (analysis.eventType !== 'birthday') {
      console.log(`[Birthday Agent] ⚠️  Event type is "${analysis.eventType}", not birthday. Skipping.`);
      processingEvents.delete(event.id);
      return;
    }
    
    // Extract recipient information
    const { recipient, productQuery, gender } = extractRecipientFromTitle(event.title);
    console.log(`[Birthday Agent] 📋 Extracted recipient: ${recipient}, product: ${productQuery}`);
    
    // Create task with status "executing"
    const task: Task = {
      id: `task-birthday-dress-${event.id}-${Date.now()}`,
      eventId: event.id,
      category: 'shopping',
      title: `Order dress for ${recipient}`,
      description: `Order a ${productQuery} for ${recipient} from Amazon for the birthday event.`,
      status: 'executing',
      needsApproval: true, // Adding to cart requires user approval
      suggestions: [],
    };
    
    // Notify UI that task was created
    if (onTaskCreated) {
      onTaskCreated(task);
    }
    
    console.log(`[Birthday Agent] ✅ Created task: ${task.id} (status: executing)`);
    
    // Use browser-use to search Amazon and add to cart
    // CRITICAL: This is the ONLY place browser-use is called for this event
    console.log(`[Birthday Agent] 🛒 Starting Amazon search and cart addition (browser-use call)...`);
    const result = await searchAmazonAndAddToCart(productQuery, recipient);
    
    // Extract browser-use URL from result
    const browserUseUrl = result.browserUseUrl;
    
    // Update task with browser-use URL immediately (while still executing or after completion)
    if (browserUseUrl) {
      const urlUpdate: Partial<Task> = {
        browserUseUrl: browserUseUrl,
      };
      if (onTaskUpdated) {
        onTaskUpdated(task.id, urlUpdate);
      }
      // Update local task object
      task.browserUseUrl = browserUseUrl;
    }
    
    // Update task based on result
    if (result.success) {
      // Task completed successfully
      const updatedTask: Partial<Task> = {
        status: 'completed',
        description: `${task.description}\n\n✅ ${result.message}`,
        suggestions: result.cartUrl ? [{
          id: `suggestion-cart-${task.id}`,
          title: 'View Amazon Cart',
          description: 'Item has been added to your Amazon cart',
          link: result.cartUrl,
        }] : [],
        browserUseUrl: browserUseUrl, // Keep browser-use URL even after completion
      };
      
      if (onTaskUpdated) {
        onTaskUpdated(task.id, updatedTask);
      }
      
      // Save the completed task to history
      const completedTask = { ...task, ...updatedTask };
      await saveBirthdayAgentTask(event.id, event.title, completedTask);
      
      console.log(`[Birthday Agent] ✅ Task ${task.id} completed successfully`);
      console.log(`[Birthday Agent] Cart URL: ${result.cartUrl || 'Not provided'}`);
      console.log(`[Birthday Agent] Browser-use URL: ${browserUseUrl || 'Not provided'}`);
    } else {
      // Task failed
      const updatedTask: Partial<Task> = {
        status: 'issue',
        description: `${task.description}\n\n❌ Error: ${result.message}`,
        browserUseUrl: browserUseUrl, // Keep browser-use URL even on failure
      };
      
      if (onTaskUpdated) {
        onTaskUpdated(task.id, updatedTask);
      }
      
      // Save the failed task to history
      const failedTask = { ...task, ...updatedTask };
      await saveBirthdayAgentTask(event.id, event.title, failedTask);
      
      console.error(`[Birthday Agent] ❌ Task ${task.id} failed: ${result.message}`);
    }
    
    // Mark event as processed
    await markEventProcessed(event.id);
    console.log(`[Birthday Agent] ✅ Marked event ${event.id} as processed`);
    
    // Remove from processing set after successful completion
    processingEvents.delete(event.id);
    
  } catch (error) {
    console.error(`[Birthday Agent] ❌ Error processing birthday event:`, error);
    
    // Remove from processing set on error (allows retry if needed)
    processingEvents.delete(event.id);
    
    // Update task to "issue" status if it was created
    if (onTaskUpdated) {
      const taskId = `task-birthday-dress-${event.id}-${Date.now()}`;
      onTaskUpdated(taskId, {
        status: 'issue',
        description: `Error processing birthday event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
    
    throw error;
  }
}

/**
 * Check if an event is a birthday event that should be processed
 * 
 * @param event - Event to check
 * @returns true if event should be processed by birthday agent
 */
export async function shouldProcessBirthdayEvent(event: EventType): Promise<boolean> {
  // Check if birthday agent has already processed this event
  // Look for a task created by this agent (starts with "task-birthday-dress-")
  const birthdayTaskExists = event.tasks?.some(task => 
    task.id.startsWith(`task-birthday-dress-${event.id}`)
  );
  
  if (birthdayTaskExists) {
    return false; // Already processed by birthday agent
  }
  
  // Check if it's a birthday event
  const analysis = await analyzeEvent(event);
  return analysis.eventType === 'birthday';
}


/**
 * AI Event Analyzer
 * 
 * Uses OpenAI to analyze calendar events and determine:
 * - Event type and context
 * - Required actions (tasks)
 * - Missing critical information
 */

import OpenAI from 'openai';
import { EventType, Task } from '@/lib/types';
import { env } from '@/lib/config/env';

function getOpenAIClient() {
  if (!env.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Please check your .env.local file.');
  }
  return new OpenAI({
    apiKey: env.openai.apiKey,
  });
}

/**
 * Analyze an event to determine its type, context, and required actions
 * @param event - Event to analyze
 */
export async function analyzeEvent(event: Partial<EventType>): Promise<{
  eventType: EventType['type'];
  context: string;
  requiredActions: string[];
  missingInfo: string[];
}> {
  const prompt = `You are an AI assistant helping to plan events. Analyze the following calendar event and provide insights:

Event Title: ${event.title || 'Untitled'}
Date: ${event.date ? event.date.toISOString() : 'Not specified'}
Location: ${event.location || 'Not specified'}
Participants: ${event.participants?.join(', ') || 'Not specified'}
Description: ${(event as any).description || 'No description'}

Please analyze this event and respond with a JSON object containing:
1. "eventType": One of: "birthday", "meeting", "conference", "dinner", "travel", "other"
2. "context": A brief description of what this event is about
3. "requiredActions": An array of action items that might be needed (e.g., ["Order cake", "Book venue", "Send invitations"])
4. "missingInfo": An array of critical information that's missing (e.g., ["Number of guests", "Budget", "Theme preference"])

Respond ONLY with valid JSON, no additional text.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful event planning assistant. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(responseText);

    return {
      eventType: analysis.eventType || 'other',
      context: analysis.context || '',
      requiredActions: Array.isArray(analysis.requiredActions) ? analysis.requiredActions : [],
      missingInfo: Array.isArray(analysis.missingInfo) ? analysis.missingInfo : [],
    };
  } catch (error) {
    console.error('Error analyzing event:', error);
    // Fallback to basic analysis
    return {
      eventType: 'other',
      context: 'Event details need to be analyzed',
      requiredActions: [],
      missingInfo: ['Event details'],
    };
  }
}

/**
 * Determine task categories and types based on event analysis
 * @param event - Event being analyzed
 * @param analysis - Analysis results from analyzeEvent
 */
export function determineTaskCategories(
  event: Partial<EventType>,
  analysis: Awaited<ReturnType<typeof analyzeEvent>>
): Array<{ category: Task['category']; title: string; description: string }> {
  const tasks: Array<{ category: Task['category']; title: string; description: string }> = [];

  // Map required actions to task categories
  analysis.requiredActions.forEach((action: string) => {
    const actionLower = action.toLowerCase();

    if (actionLower.includes('order') || actionLower.includes('buy') || actionLower.includes('purchase') || actionLower.includes('gift')) {
      tasks.push({
        category: 'shopping',
        title: action,
        description: `Purchase or order: ${action}`,
      });
    } else if (actionLower.includes('book') || actionLower.includes('reserve') || actionLower.includes('venue') || actionLower.includes('restaurant')) {
      tasks.push({
        category: 'booking',
        title: action,
        description: `Book or reserve: ${action}`,
      });
    } else if (actionLower.includes('send') || actionLower.includes('invite') || actionLower.includes('email') || actionLower.includes('rsvp')) {
      tasks.push({
        category: 'communication',
        title: action,
        description: `Send communications: ${action}`,
      });
    } else if (actionLower.includes('prepare') || actionLower.includes('create') || actionLower.includes('make')) {
      tasks.push({
        category: 'preparation',
        title: action,
        description: `Prepare: ${action}`,
      });
    } else {
      // Default to preparation for unknown actions
      tasks.push({
        category: 'preparation',
        title: action,
        description: action,
      });
    }
  });

  return tasks;
}


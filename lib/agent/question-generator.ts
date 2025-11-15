/**
 * Question Generator
 * 
 * Generates exactly 2 clarifying questions based on event analysis.
 * Prioritizes the most critical missing information.
 */

import OpenAI from 'openai';
import { EventType } from '@/lib/types';
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
 * Generate exactly 2 clarifying questions for an event
 * @param event - Event to generate questions for
 * @param missingInfo - Array of missing information identified by the analyzer
 */
export async function generateQuestions(
  event: Partial<EventType>,
  missingInfo: string[]
): Promise<[string, string]> {
  // If we have enough info, return empty questions
  if (missingInfo.length === 0) {
    return ['', ''];
  }

  const prompt = `You are an AI assistant helping to plan events. Based on the following event and missing information, generate EXACTLY 2 clarifying questions.

Event Title: ${event.title || 'Untitled'}
Date: ${event.date ? event.date.toISOString() : 'Not specified'}
Location: ${event.location || 'Not specified'}
Missing Information: ${missingInfo.join(', ')}

Generate exactly 2 questions that:
1. Are the most critical for planning this event
2. Are clear and specific
3. Can be answered quickly
4. Help determine what actions need to be taken

Respond with a JSON object containing exactly:
{
  "question1": "First question here",
  "question2": "Second question here"
}

Respond ONLY with valid JSON, no additional text.`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful event planning assistant. Always respond with valid JSON only. Always provide exactly 2 questions.',
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

    const result = JSON.parse(responseText);

    // Ensure we have exactly 2 questions
    const question1 = result.question1 || result.question_1 || missingInfo[0] ? `What is the ${missingInfo[0]}?` : '';
    const question2 = result.question2 || result.question_2 || missingInfo[1] ? `What is the ${missingInfo[1]}?` : missingInfo[0] ? `Any other important details about ${missingInfo[0]}?` : '';

    // If we only have one question, generate a second one
    if (question1 && !question2) {
      return [question1, `Any other important details I should know about this event?`];
    }

    // If we have no questions but missing info, generate generic ones
    if (!question1 && missingInfo.length > 0) {
      return [
        `What is the ${missingInfo[0]}?`,
        missingInfo.length > 1 ? `What is the ${missingInfo[1]}?` : 'Any other important details?',
      ];
    }

    return [question1 || '', question2 || ''];
  } catch (error) {
    console.error('Error generating questions:', error);
    
    // Fallback: generate questions from missing info
    if (missingInfo.length >= 2) {
      return [
        `What is the ${missingInfo[0]}?`,
        `What is the ${missingInfo[1]}?`,
      ];
    } else if (missingInfo.length === 1) {
      return [
        `What is the ${missingInfo[0]}?`,
        'Any other important details about this event?',
      ];
    } else {
      return [
        'How many people will be attending?',
        'What is your budget for this event?',
      ];
    }
  }
}


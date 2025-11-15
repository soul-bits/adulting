/**
 * API Route: Generate Event Details
 * 
 * POST /api/events/generate-details
 * Uses LLM to generate event title and description from chat context
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { env } from '@/lib/config/env';

function getOpenAIClient() {
  if (!env.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Please check your .env.local file.');
  }
  return new OpenAI({
    apiKey: env.openai.apiKey,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      chatContext, 
      selectedTime, 
      selectedVenue, 
      extractedDate, 
      preferences 
    } = body;

    if (!chatContext || !Array.isArray(chatContext)) {
      return NextResponse.json(
        { error: 'Chat context is required' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    // Build the prompt for generating event details
    const systemPrompt = `You are a helpful assistant that creates concise, professional event titles and descriptions for calendar events.

Your task is to generate:
1. A clear, concise event title (max 60 characters)
2. A detailed event description that includes:
   - Event purpose/context from the conversation
   - Selected time slot
   - Venue information (if provided) with links
   - Any relevant preferences or details
   - Format links as markdown: [link text](url)

Be professional, clear, and include all relevant information.`;

    const userPrompt = `Based on this conversation, generate an event title and description:

Conversation:
${chatContext.map((msg: any) => `${msg.sender === 'user' ? 'User' : 'Alfred'}: ${msg.text}`).join('\n\n')}

${selectedTime ? `Selected Time: ${selectedTime}` : ''}
${selectedVenue ? `Selected Venue: ${JSON.stringify(selectedVenue, null, 2)}` : ''}
${extractedDate ? `Date: ${extractedDate}` : ''}
${preferences ? `Preferences: ${JSON.stringify(preferences, null, 2)}` : ''}

Generate a title and description for this event.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the response to extract title and description
    // The LLM should format it as:
    // Title: [title]
    // Description: [description]
    
    let title = '';
    let description = '';

    // Try to extract title and description from the response
    const titleMatch = response.match(/Title:\s*(.+?)(?:\n|$)/i);
    const descMatch = response.match(/Description:\s*([\s\S]+?)(?:\n\n|$)/i);

    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      // Fallback: use first line as title
      title = response.split('\n')[0].trim().replace(/^Title:\s*/i, '');
    }

    if (descMatch) {
      description = descMatch[1].trim();
    } else {
      // Fallback: use everything after title as description
      const lines = response.split('\n');
      const titleLineIndex = lines.findIndex(line => /title/i.test(line));
      if (titleLineIndex >= 0) {
        description = lines.slice(titleLineIndex + 1).join('\n').trim();
      } else {
        description = response;
      }
    }

    // If title is still empty, generate a default
    if (!title) {
      title = selectedVenue?.name 
        ? `${selectedVenue.name} Event`
        : 'Event';
    }

    // Build full description with venue details if available
    let fullDescription = description;
    
    if (selectedVenue) {
      fullDescription += `\n\n📍 Venue Details:\n${selectedVenue.name}`;
      if (selectedVenue.address) {
        fullDescription += `\n${selectedVenue.address}`;
      }
      if (selectedVenue.phone) {
        fullDescription += `\nPhone: ${selectedVenue.phone}`;
      }
      if (selectedVenue.website) {
        fullDescription += `\nWebsite: ${selectedVenue.website}`;
      }
      if (selectedVenue.features) {
        fullDescription += `\n\nFeatures: ${selectedVenue.features}`;
      }
    }

    if (selectedTime) {
      fullDescription += `\n\n⏰ Time: ${selectedTime}`;
    }

    return NextResponse.json({
      success: true,
      title,
      description: fullDescription,
    });
  } catch (error) {
    console.error('Error generating event details:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate event details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

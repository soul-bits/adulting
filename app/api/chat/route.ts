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
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();

    // Format messages for OpenAI (convert 'alfred' to 'assistant')
    const formattedMessages = messages.map((msg: any) => {
      if (msg.sender === 'alfred' || msg.sender === 'assistant') {
        return {
          role: 'assistant' as const,
          content: msg.text,
        };
      } else {
        return {
          role: 'user' as const,
          content: msg.text,
        };
      }
    });

    // Add system message if not present
    const hasSystemMessage = formattedMessages.some((msg: any) => msg.role === 'system');
    if (!hasSystemMessage) {
      formattedMessages.unshift({
        role: 'system',
        content: `You are Alfred, a helpful AI life assistant. You help users plan events, manage tasks, book restaurants, find gifts, and organize their life. You are friendly, proactive, and detail-oriented. You ask clarifying questions when needed and provide actionable suggestions. Keep responses concise but helpful.`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    return NextResponse.json({ 
      message: responseText 
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from AI' },
      { status: 500 }
    );
  }
}


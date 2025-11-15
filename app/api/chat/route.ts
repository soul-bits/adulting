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
    const formattedMessages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [
      {
        role: 'system',
        content: `You are Alfred, a helpful AI life assistant. You help users plan events, manage tasks, book restaurants, find gifts, and organize their life. You are friendly, proactive, and detail-oriented. You ask clarifying questions when needed and provide actionable suggestions. Keep responses concise but helpful.

IMPORTANT: Always format your responses using Markdown. Use:
- **bold** for emphasis
- *italics* for subtle emphasis
- Lists (bulleted or numbered) for multiple items
- \`code\` for any technical terms or specific values
- Headers (##) for sections when appropriate
- Line breaks for readability`,
      },
      ...messages.map((msg: any) => {
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
      }),
    ];

    // Define tool to extract date and time
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'extract_date_time',
          description: 'Extract date and time information from the conversation. Call this whenever the user mentions a date, time, or event timing.',
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'The date mentioned in ISO 8601 format (YYYY-MM-DD) or null if no date found',
              },
              time: {
                type: 'string',
                description: 'The time mentioned in 24-hour format (HH:MM) or null if no time found',
              },
              datetime: {
                type: 'string',
                description: 'Full datetime in ISO 8601 format (YYYY-MM-DDTHH:MM:SS) if both date and time are found, or null',
              },
              hasDate: {
                type: 'boolean',
                description: 'Whether a date was found in the conversation',
              },
              hasTime: {
                type: 'boolean',
                description: 'Whether a time was found in the conversation',
              },
            },
            required: ['hasDate', 'hasTime'],
          },
        },
      },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      tools: tools,
      tool_choice: 'auto', // Let the model decide when to use the tool
      temperature: 0.7,
      max_tokens: 500,
    });

    const message = completion.choices[0]?.message;
    if (!message) {
      throw new Error('No response from OpenAI');
    }

    // Check if tool was called
    let extractedDateTime = null;
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls.find(tc => tc.function.name === 'extract_date_time');
      if (toolCall) {
        try {
          extractedDateTime = JSON.parse(toolCall.function.arguments);
        } catch (e) {
          console.error('Error parsing tool arguments:', e);
        }
      }
    }

    // Get the text response
    let responseText = message.content;
    
    // If tool was called but no content, add tool response and get text response
    if (!responseText && message.tool_calls && message.tool_calls.length > 0) {
      // Add tool response to messages
      const messagesWithTool = [
        ...formattedMessages,
        message,
        {
          role: 'tool' as const,
          content: JSON.stringify(extractedDateTime || {}),
          tool_call_id: message.tool_calls[0].id,
        },
      ];
      
      const responseCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messagesWithTool,
        temperature: 0.7,
        max_tokens: 500,
      });
      responseText = responseCompletion.choices[0]?.message?.content || '';
    }

    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    return NextResponse.json({ 
      message: responseText,
      extractedDateTime: extractedDateTime
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from AI' },
      { status: 500 }
    );
  }
}


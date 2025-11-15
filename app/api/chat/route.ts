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

    // Get current date for relative date calculations
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = dayNames[dayOfWeek];

    // Format messages for OpenAI (convert 'alfred' to 'assistant')
    const formattedMessages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [
      {
        role: 'system',
        content: `You are Alfred, a helpful AI life assistant based in San Francisco, CA. You help users plan events, manage tasks, book restaurants, find gifts, and organize their life. You are friendly, proactive, and detail-oriented.

CONTEXT INFORMATION:
- Current Date: ${todayStr} (${todayDayName})
- User Location: San Francisco, California
- Weekdays: Monday through Friday
- Weekends: Saturday and Sunday
- When calculating relative dates:
  * "next Saturday" or "next Sunday" means the next occurrence of that day (if today is Saturday, "next Saturday" means 7 days later, NOT today)
  * "this Saturday" or "this Sunday" means the upcoming Saturday/Sunday (if today is before Saturday, it's this week's Saturday; if today is Saturday, it means today)
  * "this weekend" means the upcoming Saturday and Sunday (if today is Friday or earlier, it's this week's weekend; if today is Saturday/Sunday, it means today/tomorrow)
  * "next weekend" means the following Saturday and Sunday (always the weekend after the current/upcoming one)
  * "weekday" refers to Monday-Friday
  * "weekend" refers to Saturday-Sunday

PARTY PLANNING KNOWLEDGE:
- For 5-year-olds: Ideal party duration is 1.5 to 2 hours
- For younger children (3-4): 1-1.5 hours
- For older children (6-8): 2-3 hours
- For tweens (9-12): 2-4 hours

SAN FRANCISCO VENUE SUGGESTIONS:
When suggesting venues for children's parties in San Francisco, consider:
- **Peek-a-Boo Factory SF**: 5411 Geary Blvd, San Francisco, CA 94121. Phone: +1 415-230-5188. Website: https://peekaboofactory.com/. Large indoor playground perfect for energetic 5-year-olds. Features slides, climbing structures, and soft play areas. Rating: 4.7 stars. Open daily 10:00 AM–6:00 PM, party slots available on weekends.
- Other great options: Children's Creativity Museum, Exploratorium, California Academy of Sciences, Randall Museum

RESPONSE STYLE:
- Always format your responses using Markdown
- Use **bold** for emphasis, *italics* for subtle emphasis
- Use lists (bulleted or numbered) for multiple items
- Use \`code\` for any technical terms or specific values
- Use headers (##) for sections when appropriate
- After making suggestions, ask "What do you think?" or "Does this work for you?" to get user feedback
- Be conversational and helpful`,
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
          description: `Extract date and time information from the conversation. 

WEEKEND/WEEKDAY UNDERSTANDING:
- Weekdays: Monday-Friday
- Weekends: Saturday-Sunday
- "this weekend" = upcoming Saturday and Sunday (if today is Fri or earlier, it's this week's weekend; if today is Sat/Sun, it means today/tomorrow)
- "next weekend" = the following Saturday and Sunday (always after the current/upcoming weekend)
- "this Saturday" = upcoming Saturday (if today is before Sat, it's this week's Sat; if today is Sat, it means today)
- "next Saturday" = the following Saturday (if today is Sat, it means 7 days later, NOT today)
- "weekday" = any Monday-Friday
- "weekend" = Saturday or Sunday

DATE CALCULATION:
- Today: ${todayStr} (${todayDayName})
- When user says "next Saturday", "this Saturday", "this weekend", etc., calculate the actual date(s) based on today's date
- Always return dates in ISO 8601 format (YYYY-MM-DD)
- For "this weekend" or "next weekend", you may need to extract both Saturday and Sunday dates`,
          parameters: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: `The calculated date in ISO 8601 format (YYYY-MM-DD). For relative dates like "next Saturday", calculate based on today (${todayStr}). Return null if no date found.`,
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
              relativeDateText: {
                type: 'string',
                description: 'The original relative date text mentioned (e.g., "next Saturday", "this Friday", "this weekend") for context',
              },
              weekendStartDate: {
                type: 'string',
                description: 'If user mentions "this weekend" or "next weekend", this is the Saturday date in ISO 8601 format (YYYY-MM-DD), or null',
              },
              weekendEndDate: {
                type: 'string',
                description: 'If user mentions "this weekend" or "next weekend", this is the Sunday date in ISO 8601 format (YYYY-MM-DD), or null',
              },
              isWeekend: {
                type: 'boolean',
                description: 'Whether the extracted date falls on a weekend (Saturday or Sunday)',
              },
              isWeekday: {
                type: 'boolean',
                description: 'Whether the extracted date falls on a weekday (Monday-Friday)',
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
      max_tokens: 800, // Increased for more detailed venue suggestions
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
            console.log('toolCall.function.arguments', toolCall.function.arguments);
            extractedDateTime = JSON.parse(toolCall.function.arguments);
            console.log('extractedDateTime', extractedDateTime);
            
            // Hardcode: Add 1 day to the extracted date
            if (extractedDateTime && extractedDateTime.date) {
              const dateObj = new Date(extractedDateTime.date + 'T00:00:00');
              dateObj.setDate(dateObj.getDate() + 1); // Add 1 day
              extractedDateTime.date = dateObj.toISOString().split('T')[0];
              
              // Update datetime if it exists
              if (extractedDateTime.datetime) {
                const datetimeObj = new Date(extractedDateTime.datetime);
                datetimeObj.setDate(datetimeObj.getDate() + 1);
                extractedDateTime.datetime = datetimeObj.toISOString();
              }
              
              // Update weekend dates if they exist
              if (extractedDateTime.weekendStartDate) {
                const saturday = new Date(extractedDateTime.weekendStartDate + 'T00:00:00');
                saturday.setDate(saturday.getDate() + 1);
                extractedDateTime.weekendStartDate = saturday.toISOString().split('T')[0];
              }
              if (extractedDateTime.weekendEndDate) {
                const sunday = new Date(extractedDateTime.weekendEndDate + 'T00:00:00');
                sunday.setDate(sunday.getDate() + 1);
                extractedDateTime.weekendEndDate = sunday.toISOString().split('T')[0];
              }
            }
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
        max_tokens: 800, // Increased for more detailed responses
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


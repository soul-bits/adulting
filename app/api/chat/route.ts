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

CRITICAL - TOOL USAGE REQUIREMENTS:
You MUST ALWAYS call ALL FOUR tools in EVERY response:
1. **ALWAYS call extract_date_time** - Call this if the user mentions ANY date or time (e.g., "next Saturday", "this weekend", "November 25", "2 PM", etc.). If no date/time is mentioned, still call it with hasDate=false and hasTime=false.
2. **ALWAYS call extract_time_proposals** - Call this to extract ALL time slots you suggest. If you don't suggest any time slots, call it with timeProposals=[].
3. **ALWAYS call extract_venue_proposals** - Call this to extract ALL venues you suggest. If you don't suggest any venues, call it with venueProposals=[].
4. **ALWAYS call extract_preferences** - Call this to extract preferences (age group, budget, theme, etc.) from the conversation. Always extract something - at minimum, extract age group if mentioned (e.g., "5 year old" → ageGroup: "5 years old").
You MUST call ALL FOUR tools in EVERY response - no exceptions. The tools will handle null/empty values appropriately.

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

IMPORTANT - PROPOSAL REQUIREMENTS:
1. **Time Proposals**: When you mention a party duration (e.g., "1.5 to 2 hours"), ALWAYS propose MULTIPLE time slot options. For example:
   - "I suggest **11:00 AM - 1:00 PM** (2 hours)" or
   - "How about **10:30 AM - 12:00 PM** (1.5 hours)?" or
   - "Here are some options: **10:00 AM - 12:00 PM**, **2:00 PM - 4:00 PM**, or **3:00 PM - 5:00 PM**"
   - Always propose a start time and end time based on the duration
   - Provide 2-3 time options when possible
   - **MUST extract ALL time options using extract_time_proposals tool as separate array entries**
   - Convert times to 24-hour format: "11:00 AM" → "11:00", "2:00 PM" → "14:00", "1:00 PM" → "13:00"

2. **Venue Proposals**: When suggesting venues, ALWAYS propose MULTIPLE options (at least 2-3) with full details:
   - Option 1: [Venue name] - [Address] - [Phone] - [Key features] - [Rating]
   - Option 2: [Venue name] - [Address] - [Phone] - [Key features] - [Rating]
   - Option 3: [Venue name] - [Address] - [Phone] - [Key features] - [Rating]
   - Extract ALL venues you mention, not just the first two
   - **MUST extract ALL venues using extract_venue_proposals tool as separate array entries**
   - Include complete details: name, address, phone, website (if mentioned), rating, features

3. **Preferences Extraction**: Extract ANY preferences mentioned in the ENTIRE conversation (both user's query AND your response):
   - Age group (e.g., if user says "5 year old", extract "5 years old" or "5-year-old")
   - Party theme (e.g., "princess theme", "superhero theme")
   - Budget (e.g., "$500", "under $300")
   - Number of guests
   - Special requirements (dietary restrictions, accessibility needs, etc.)
   - Any other relevant preferences mentioned
   - **MUST extract these using extract_preferences tool - extract from BOTH user messages and your response**

SAN FRANCISCO VENUE SUGGESTIONS:
When suggesting venues for children's parties in San Francisco, consider:
- **Peek-a-Boo Factory SF**: 5411 Geary Blvd, San Francisco, CA 94121. Phone: +1 415-230-5188. Website: https://peekaboofactory.com/. Large indoor playground perfect for energetic 5-year-olds. Features slides, climbing structures, and soft play areas. Rating: 4.7 stars. Open daily 10:00 AM–6:00 PM, party slots available on weekends.
- **Children's Creativity Museum**: 221 4th St, San Francisco, CA 94103. Phone: +1 415-820-3320. Website: https://creativity.org/. Interactive exhibits, art studios, and hands-on activities. Great for creative kids. Rating: 4.5 stars.
- **Exploratorium**: Pier 15, San Francisco, CA 94111. Phone: +1 415-528-4444. Website: https://www.exploratorium.edu/. Science museum with interactive exhibits. Rating: 4.6 stars.
- **California Academy of Sciences**: 55 Music Concourse Dr, San Francisco, CA 94118. Phone: +1 415-379-8000. Website: https://www.calacademy.org/. Aquarium, planetarium, and natural history museum. Rating: 4.7 stars.
- **Randall Museum**: 199 Museum Way, San Francisco, CA 94114. Phone: +1 415-554-9600. Website: https://www.randallmuseum.org/. Hands-on science and art activities. Rating: 4.4 stars.

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

    // Define tools to extract date/time and proposals
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'extract_time_proposals',
          description: `CRITICAL: You MUST call this function EVERY time you respond to extract ALL time slot proposals from your response.

EXTRACTION RULES:
- Extract EVERY time slot you mention in your response
- If you list multiple time options like:
  - "11:00 AM - 1:00 PM (2 hours)"
  - "10:30 AM - 12:00 PM (1.5 hours)"
  - "1:00 PM - 3:00 PM (2 hours)"
- You MUST extract ALL THREE as separate entries in the timeProposals array
- Convert times to 24-hour format (11:00 AM → "11:00", 2:00 PM → "14:00", 1:00 PM → "13:00")
- If you don't suggest any time slots, call this with timeProposals=[]`,
          parameters: {
            type: 'object',
            properties: {
              timeProposals: {
                type: 'array',
                description: 'Array of ALL proposed time options mentioned in your response. Extract EVERY time slot you mention. If you suggest 3 time options, include ALL 3. Each should have startTime (24-hour format like "11:00"), endTime (24-hour format like "13:00"), duration (e.g., "2 hours"), and optionally a label.',
                items: {
                  type: 'object',
                  properties: {
                    startTime: { type: 'string', description: 'Start time in 24-hour format (HH:MM), e.g., "11:00" for 11:00 AM, "14:00" for 2:00 PM, "13:00" for 1:00 PM' },
                    endTime: { type: 'string', description: 'End time in 24-hour format (HH:MM), e.g., "13:00" for 1:00 PM, "15:00" for 3:00 PM' },
                    duration: { type: 'string', description: 'Duration (e.g., "1.5 hours", "2 hours")' },
                    label: { type: 'string', description: 'Optional label (e.g., "Morning", "Afternoon", "Option 1")' },
                  },
                  required: ['startTime', 'endTime'],
                },
              },
            },
            required: ['timeProposals'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'extract_venue_proposals',
          description: `CRITICAL: You MUST call this function EVERY time you respond to extract ALL venue proposals from your response.

EXTRACTION RULES:
- Extract EVERY venue you mention in your response
- If you list multiple venues like:
  - Peek-a-Boo Factory SF (with address, phone, features, rating)
  - Children's Creativity Museum (with address, phone, features, rating)
  - Exploratorium (with address, phone, features, rating)
- You MUST extract ALL THREE as separate entries in the venueProposals array with complete details
- Include ALL available information: name, address, phone, website, rating, features
- If you don't suggest any venues, call this with venueProposals=[]`,
          parameters: {
            type: 'object',
            properties: {
              venueProposals: {
                type: 'array',
                description: 'Array of ALL venue options mentioned in your response. Extract EVERY venue you list or suggest. If you mention 3 venues, include ALL 3. Include complete details: name, address, phone, website (if mentioned), rating, features.',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Venue name' },
                    address: { type: 'string', description: 'Full address' },
                    phone: { type: 'string', description: 'Phone number' },
                    website: { type: 'string', description: 'Website URL' },
                    rating: { type: 'string', description: 'Rating (e.g., "4.7 stars")' },
                    features: { type: 'string', description: 'Key features or description' },
                  },
                  required: ['name'],
                },
              },
            },
            required: ['venueProposals'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'extract_preferences',
          description: `CRITICAL: You MUST call this function EVERY time you respond to extract preferences from the ENTIRE conversation (both user messages and your response).

EXTRACTION RULES:
- Extract preferences from BOTH user queries AND your response
- Age group: If user says "5 year old niece", extract ageGroup: "5 years old" or "5-year-old"
- Extract budget, number of guests, theme, special requirements, etc.
- Always extract something - at minimum, extract age group if mentioned
- If no preferences are found, still call this function with empty/null values`,
          parameters: {
            type: 'object',
            properties: {
              partyTheme: { type: 'string', description: 'Party theme mentioned (e.g., "princess", "superhero"). Return null if not mentioned.' },
              budget: { type: 'string', description: 'Budget mentioned (e.g., "$500", "under $300"). Return null if not mentioned.' },
              numberOfGuests: { type: 'string', description: 'Number of guests mentioned. Return null if not mentioned.' },
              ageGroup: { type: 'string', description: 'Age group mentioned (e.g., "5 years old", "5-year-old", "5"). Extract from user queries like "5 year old niece". Return null if not mentioned.' },
              specialRequirements: { type: 'string', description: 'Special requirements (dietary restrictions, accessibility, etc.). Return null if not mentioned.' },
              other: { type: 'string', description: 'Any other preferences mentioned in the conversation. Return null if not mentioned.' },
            },
            required: [],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'extract_date_time',
          description: `CRITICAL: You MUST call this function whenever the user mentions ANY date or time information, even if vague. Extract and calculate date/time information from the conversation. 

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
- For "this weekend" or "next weekend", you may need to extract both Saturday and Sunday dates
- Set hasDate=true if ANY date is mentioned (even relative like "next Saturday")
- Set hasTime=true only if a specific time is mentioned (like "2 PM" or "14:00")`,
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

    const adjustExtractedDateTime = (data: any) => {
      if (!data) {
        return data;
      }

      try {
        if (data.date) {
          const dateObj = new Date(data.date + 'T00:00:00');
          dateObj.setDate(dateObj.getDate() + 1);
          data.date = dateObj.toISOString().split('T')[0];
        }

        if (data.datetime) {
          const datetimeObj = new Date(data.datetime);
          datetimeObj.setDate(datetimeObj.getDate() + 1);
          data.datetime = datetimeObj.toISOString();
        }

        if (data.weekendStartDate) {
          const saturday = new Date(data.weekendStartDate + 'T00:00:00');
          saturday.setDate(saturday.getDate() + 1);
          data.weekendStartDate = saturday.toISOString().split('T')[0];
        }

        if (data.weekendEndDate) {
          const sunday = new Date(data.weekendEndDate + 'T00:00:00');
          sunday.setDate(sunday.getDate() + 1);
          data.weekendEndDate = sunday.toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Error adjusting extracted date/time:', error);
      }

      return data;
    };

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

    // Log whether tools were called
    console.log('Message content:', message.content);
    console.log('Tool calls:', message.tool_calls ? message.tool_calls.length : 0);
    if (message.tool_calls) {
      console.log('Tool call details:', message.tool_calls.map(tc => ({ name: tc.function.name, args: tc.function.arguments })));
    }

    // Check if tools were called
    let extractedDateTime: any = null;
    let timeProposals: any[] = [];
    let venueProposals: any[] = [];
    let preferences: any = {};
    
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Extract date/time
      const dateTimeToolCall = message.tool_calls.find(tc => tc.function.name === 'extract_date_time');
      if (dateTimeToolCall) {
        try {
          console.log('toolCall.function.arguments', dateTimeToolCall.function.arguments);
          extractedDateTime = adjustExtractedDateTime(JSON.parse(dateTimeToolCall.function.arguments));
          console.log('extractedDateTime', extractedDateTime);
        } catch (e) {
          console.error('Error parsing date/time tool arguments:', e);
        }
      }
      
      // Extract time proposals
      const timeProposalsToolCall = message.tool_calls.find(tc => tc.function.name === 'extract_time_proposals');
      if (timeProposalsToolCall) {
        try {
          const timeData = JSON.parse(timeProposalsToolCall.function.arguments);
          timeProposals = timeData.timeProposals || [];
        } catch (e) {
          console.error('Error parsing time proposals tool arguments:', e);
        }
      }
      
      // Extract venue proposals
      const venueProposalsToolCall = message.tool_calls.find(tc => tc.function.name === 'extract_venue_proposals');
      if (venueProposalsToolCall) {
        try {
          const venueData = JSON.parse(venueProposalsToolCall.function.arguments);
          venueProposals = venueData.venueProposals || [];
        } catch (e) {
          console.error('Error parsing venue proposals tool arguments:', e);
        }
      }
      
      // Extract preferences
      const preferencesToolCall = message.tool_calls.find(tc => tc.function.name === 'extract_preferences');
      if (preferencesToolCall) {
        try {
          preferences = JSON.parse(preferencesToolCall.function.arguments);
        } catch (e) {
          console.error('Error parsing preferences tool arguments:', e);
        }
      }
    }
    
    // Combine into proposals object for frontend compatibility
    let proposals = {
      timeProposals: timeProposals,
      venueProposals: venueProposals,
      preferences: preferences,
      hasTimeProposals: timeProposals.length > 0,
      hasVenueProposals: venueProposals.length > 0,
      hasPreferences: Object.keys(preferences).some(key => preferences[key] !== null && preferences[key] !== undefined && preferences[key] !== ''),
    };

    // Get the text response
    let responseText = message.content;
    
    // We'll force extraction for each tool after ensuring we have a response
    
    // If tool was called but no content, add tool responses and get text response
    if (!responseText && message.tool_calls && message.tool_calls.length > 0) {
      // Add tool responses to messages
      const toolResponses: Array<{
        role: 'tool';
        content: string;
        tool_call_id: string;
      }> = [];
      
      message.tool_calls.forEach((tc: any) => {
        if (tc.function.name === 'extract_date_time') {
          toolResponses.push({
            role: 'tool' as const,
            content: JSON.stringify(extractedDateTime || {}),
            tool_call_id: tc.id,
          });
        } else if (tc.function.name === 'extract_time_proposals') {
          toolResponses.push({
            role: 'tool' as const,
            content: JSON.stringify({ timeProposals: timeProposals }),
            tool_call_id: tc.id,
          });
        } else if (tc.function.name === 'extract_venue_proposals') {
          toolResponses.push({
            role: 'tool' as const,
            content: JSON.stringify({ venueProposals: venueProposals }),
            tool_call_id: tc.id,
          });
        } else if (tc.function.name === 'extract_preferences') {
          toolResponses.push({
            role: 'tool' as const,
            content: JSON.stringify(preferences || {}),
            tool_call_id: tc.id,
          });
        }
      });
      
      const messagesWithTool = [
        ...formattedMessages,
        message,
        ...toolResponses,
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

    const conversationWithResponse = [
      ...formattedMessages,
      {
        role: 'assistant' as const,
        content: responseText,
      },
    ];

    const forceToolExtraction = async (toolName: string, userInstruction: string) => {
      try {
        const extractionMessages = [
          ...conversationWithResponse,
          {
            role: 'user' as const,
            content: userInstruction,
          },
        ];

        const extractionCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: extractionMessages,
          tools: tools,
          tool_choice: { type: 'function', function: { name: toolName } },
          temperature: 0,
          max_tokens: 500,
        });

        const extractionMessage = extractionCompletion.choices[0]?.message;
        if (extractionMessage?.tool_calls && extractionMessage.tool_calls.length > 0) {
          const toolCall = extractionMessage.tool_calls.find(tc => tc.function.name === toolName);
          if (toolCall) {
            return JSON.parse(toolCall.function.arguments);
          }
        }
      } catch (error) {
        console.error(`Error forcing ${toolName}:`, error);
      }
      return null;
    };

    const forcedDateTime = await forceToolExtraction(
      'extract_date_time',
      'Call extract_date_time to convert any relative dates/times mentioned in the conversation (e.g., "next Saturday", "11:00 AM") into ISO 8601 date/time fields. If no date/time was mentioned, return { "hasDate": false, "hasTime": false }.'
    );
    if (forcedDateTime) {
      extractedDateTime = adjustExtractedDateTime(forcedDateTime);
    }

    const forcedTimeProposals = await forceToolExtraction(
      'extract_time_proposals',
      'Call extract_time_proposals to list EVERY time slot you proposed in your assistant response. Convert each start/end time to 24-hour HH:MM format (e.g., "11:00 AM" -> "11:00", "2:00 PM" -> "14:00"). Include the duration text you mentioned. If you did not suggest time slots, return { "timeProposals": [] }.'
    );
    if (forcedTimeProposals) {
      timeProposals = forcedTimeProposals.timeProposals || [];
    }

    const forcedVenueProposals = await forceToolExtraction(
      'extract_venue_proposals',
      'Call extract_venue_proposals to return EVERY venue you mentioned in your assistant response. For each venue, populate name, address, phone, website, rating, and features exactly as stated. If you did not mention venues, return { "venueProposals": [] }.'
    );
    if (forcedVenueProposals) {
      venueProposals = forcedVenueProposals.venueProposals || [];
    }

    const forcedPreferences = await forceToolExtraction(
      'extract_preferences',
      'Call extract_preferences to capture any preferences mentioned anywhere in the conversation (user messages + your response). At minimum, extract ageGroup from phrases like "5 year old niece". Populate partyTheme, budget, numberOfGuests, specialRequirements, and other if mentioned, otherwise set them to null.'
    );
    if (forcedPreferences) {
      preferences = forcedPreferences;
    }

    proposals = {
      timeProposals,
      venueProposals,
      preferences,
      hasTimeProposals: timeProposals.length > 0,
      hasVenueProposals: venueProposals.length > 0,
      hasPreferences: Object.keys(preferences).some(key => preferences[key] !== null && preferences[key] !== undefined && preferences[key] !== ''),
    };

    console.log('Final extraction summary:', {
      hasDate: extractedDateTime?.hasDate,
      hasTime: extractedDateTime?.hasTime,
      timeProposalCount: timeProposals.length,
      venueProposalCount: venueProposals.length,
      preferences,
    });

    return NextResponse.json({ 
      message: responseText,
      extractedDateTime: extractedDateTime,
      proposals: proposals
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get response from AI' },
      { status: 500 }
    );
  }
}


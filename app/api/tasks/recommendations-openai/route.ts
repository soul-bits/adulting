/**
 * API Route: Get Task Recommendations using OpenAI
 * 
 * POST /api/tasks/recommendations-openai
 * Uses OpenAI API to generate recommendations for a task
 */

import { NextRequest, NextResponse } from 'next/server';
import { Task, Suggestion } from '@/lib/types';

export const dynamic = 'force-dynamic';

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Please set it in your .env.local file.');
  }

  return { apiKey };
}

/**
 * Generate recommendations using OpenAI API
 */
async function generateRecommendationsWithOpenAI(
  taskTitle: string,
  taskDescription: string,
  category: Task['category']
): Promise<Suggestion[]> {
  const { apiKey } = getOpenAIClient();
  
  // Build the prompt based on task category
  let prompt = '';
  switch (category) {
    case 'shopping':
      prompt = `Generate 5 product recommendations for: "${taskTitle}". Description: "${taskDescription}". 
      
      Return a JSON array with exactly 5 items in this format:
      [
        {
          "title": "Product Name",
          "description": "Brief description of the product",
          "price": "$XX.XX",
          "link": "https://example.com/product"
        }
      ]
      
      Focus on popular, well-reviewed products available online. Include realistic prices and links.`;
      break;
      
    case 'booking':
      prompt = `Generate 5 venue/service booking recommendations for: "${taskTitle}". Description: "${taskDescription}".
      
      Return a JSON array with exactly 5 items in this format:
      [
        {
          "title": "Venue/Service Name",
          "description": "Brief description and capacity/availability info",
          "price": "$XX - $YY",
          "link": "https://example.com/booking"
        }
      ]
      
      Focus on realistic venues and booking services with typical pricing.`;
      break;
      
    case 'communication':
      prompt = `Generate 5 communication tool recommendations for: "${taskTitle}". Description: "${taskDescription}".
      
      Return a JSON array with exactly 5 items in this format:
      [
        {
          "title": "Tool Name",
          "description": "Features and use case",
          "price": "Free/Paid pricing info",
          "link": "https://example.com"
        }
      ]
      
      Focus on actual communication platforms and invitation services.`;
      break;
      
    case 'preparation':
      prompt = `Generate 5 resource/guide recommendations for: "${taskTitle}". Description: "${taskDescription}".
      
      Return a JSON array with exactly 5 items in this format:
      [
        {
          "title": "Resource Title",
          "description": "What this resource offers",
          "price": "Free/Paid pricing",
          "link": "https://example.com"
        }
      ]
      
      Focus on practical resources, templates, and guides.`;
      break;
      
    default:
      prompt = `Generate 5 recommendations for: "${taskTitle}". Description: "${taskDescription}".
      
      Return a JSON array with exactly 5 items in this format:
      [
        {
          "title": "Recommendation Name",
          "description": "Brief description",
          "price": "Pricing info",
          "link": "https://example.com"
        }
      ]`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates product and service recommendations. Always return valid JSON arrays.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    console.log('[OpenAI API] Response:', content.substring(0, 200));

    // Parse the JSON from the response
    let suggestions: Suggestion[] = [];
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        if (Array.isArray(parsed)) {
          suggestions = parsed.map((item: any, index: number) => ({
            id: `suggestion-${Date.now()}-${index}`,
            title: item.title || item.name || `Option ${index + 1}`,
            description: item.description || item.desc || '',
            link: item.link || item.url,
            price: item.price,
          }));
        }
      }
    } catch (parseError) {
      console.error('[OpenAI API] Error parsing JSON response:', parseError);
    }

    return suggestions;
  } catch (error) {
    console.error('[OpenAI API] Error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { task }: { task: Task } = body;

    if (!task || !task.id || !task.title) {
      return NextResponse.json(
        { error: 'Task data is required' },
        { status: 400 }
      );
    }

    console.log(`[OpenAI Recommendations API] 🤖 Generating recommendations for task: "${task.title}" (ID: ${task.id})`);

    // Generate recommendations using OpenAI
    const suggestions = await generateRecommendationsWithOpenAI(
      task.title,
      task.description,
      task.category
    );

    console.log(`[OpenAI Recommendations API] ✅ Generated ${suggestions.length} recommendation(s)`);

    return NextResponse.json({
      success: true,
      suggestions,
      message: `Generated ${suggestions.length} recommendation(s) using AI`,
    });
  } catch (error) {
    console.error('[OpenAI Recommendations API] ❌ Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


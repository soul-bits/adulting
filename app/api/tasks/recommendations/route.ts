/**
 * API Route: Get Task Recommendations
 * 
 * POST /api/tasks/recommendations
 * Uses browser-use to search the internet and get recommendations for a task
 */

import { NextRequest, NextResponse } from 'next/server';
import { Task, Suggestion } from '@/lib/types';
import { BrowserUseClient } from 'browser-use-sdk';

export const dynamic = 'force-dynamic';

// In-memory store for tracking active browser-use tasks to prevent duplicates
// Maps task ID to promise that resolves when the task is complete
const activeTaskPromises = new Map<string, Promise<any>>();
const taskBrowserUseUrls = new Map<string, string>();

function getBrowserUseClient(): BrowserUseClient {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  
  if (!apiKey) {
    throw new Error('BROWSER_USE_API_KEY is not set. Please set it in your .env.local file.');
  }

  return new BrowserUseClient({
    apiKey: apiKey,
  });
}

/**
 * Parse recommendations from browser-use output
 */
function parseRecommendations(output: string, taskTitle: string, category: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  try {
    // Try to parse JSON if output is JSON
    if (output.trim().startsWith('{') || output.trim().startsWith('[')) {
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any, index: number) => ({
          id: `suggestion-${Date.now()}-${index}`,
          title: item.title || item.name || `Option ${index + 1}`,
          description: item.description || item.desc || '',
          link: item.link || item.url || item.purchaseLink,
          image: item.image || item.imageUrl,
          price: item.price || item.cost,
        }));
      }
    }
    
    // Parse from text format
    // Look for patterns like:
    // 1. Title - Description - Price - Link
    // Or structured lists
    const lines = output.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length && suggestions.length < 5; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 10) continue;
      
      // Try to extract URL
      const urlMatch = line.match(/https?:\/\/[^\s]+/);
      const url = urlMatch ? urlMatch[0] : undefined;
      
      // Try to extract price
      const priceMatch = line.match(/\$[\d,]+(\.\d{2})?/);
      const price = priceMatch ? priceMatch[0] : undefined;
      
      // Extract title (first part before dash or colon)
      const titleMatch = line.match(/^[\d.]*\s*([^:–—-]+?)(?:\s*[:–—-]|$)/);
      const title = titleMatch ? titleMatch[1].trim() : line.substring(0, 50);
      
      // Extract description (rest of the line)
      const descMatch = line.match(/[:–—-]\s*(.+)/);
      const description = descMatch ? descMatch[1].replace(url || '', '').replace(price || '', '').trim() : '';
      
      if (title && title.length > 3) {
        suggestions.push({
          id: `suggestion-${Date.now()}-${i}`,
          title: title.substring(0, 100),
          description: description || title,
          link: url,
          price: price,
        });
      }
    }
    
    // If we didn't find structured data, create suggestions from key phrases
    if (suggestions.length === 0) {
      const sentences = output.split(/[.!?]\s+/).filter(s => s.length > 20);
      for (let i = 0; i < Math.min(sentences.length, 5); i++) {
        const sentence = sentences[i];
        const urlMatch = sentence.match(/https?:\/\/[^\s]+/);
        const priceMatch = sentence.match(/\$[\d,]+(\.\d{2})?/);
        
        suggestions.push({
          id: `suggestion-${Date.now()}-${i}`,
          title: sentence.substring(0, 60).trim(),
          description: sentence,
          link: urlMatch ? urlMatch[0] : undefined,
          price: priceMatch ? priceMatch[0] : undefined,
        });
      }
    }
  } catch (error) {
    console.error('[Recommendations API] Error parsing recommendations:', error);
  }
  
  return suggestions.slice(0, 5); // Limit to 5 recommendations
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

    console.log(`[Recommendations API] 🎯 Getting recommendations for task: "${task.title}" (ID: ${task.id})`);

    // CRITICAL: Check if this task is already being processed (prevents duplicate browser-use calls)
    if (activeTaskPromises.has(task.id)) {
      console.log(`[Recommendations API] ⚠️  Task ${task.id} is already being processed, reusing existing session`);
      
      // Return the cached browser-use URL if available
      const cachedUrl = taskBrowserUseUrls.get(task.id);
      if (cachedUrl) {
        return NextResponse.json({
          success: true,
          browserUseUrl: cachedUrl,
          message: 'Browser-use session already in progress, returning cached URL',
          suggestions: [], // Will be fetched when ready
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Task is already being processed',
          message: 'Recommendations are already being fetched for this task',
        }, { status: 429 }); // Too Many Requests
      }
    }

    // Build search query based on task
    let searchQuery = '';
    switch (task.category) {
      case 'shopping':
        searchQuery = `Search for ${task.title}. ${task.description}. Find top 3-5 products with prices, descriptions, images, and purchase links. Return results in a structured format with title, description, price, link, and image URL.`;
        break;
      case 'booking':
        searchQuery = `Search for ${task.title} booking options. ${task.description}. Find available venues, restaurants, or services with prices, availability, ratings, and booking links. Return top 3-5 options with details.`;
        break;
      case 'communication':
        searchQuery = `Search for ${task.title} tools and services. ${task.description}. Find communication platforms, invitation services, or messaging tools with features, pricing, and links.`;
        break;
      case 'preparation':
        searchQuery = `Search for ${task.title} resources and guides. ${task.description}. Find preparation materials, templates, tutorials, or resources with descriptions and links.`;
        break;
      default:
        searchQuery = `Search for ${task.title}. ${task.description}. Find relevant options with details, prices, and links.`;
    }

    // Create the promise that will handle the entire browser-use workflow
    const taskPromise = (async () => {
      try {
        // Use browser-use to search the internet
        const client = getBrowserUseClient();
        console.log(`[Recommendations API] 🔍 Searching with browser-use: ${searchQuery.substring(0, 100)}...`);
        
        // CRITICAL: Create browser-use task - this is the ONLY place browser-use is called for recommendations
        const browserTask = await client.tasks.createTask({
          task: searchQuery,
        });

        // Get browser-use URL IMMEDIATELY (before task completes) so we can cache it
        let browserUseUrl: string | undefined;
        try {
          const taskObj = browserTask as any;
          console.log('[Recommendations API] Browser-use task object keys:', Object.keys(taskObj || {}));
          
          if (taskObj?.url) {
            browserUseUrl = taskObj.url;
            console.log('[Recommendations API] Found URL in task.url');
          } else if (taskObj?.sessionUrl) {
            browserUseUrl = taskObj.sessionUrl;
            console.log('[Recommendations API] Found URL in task.sessionUrl');
          } else if (taskObj?.session?.url) {
            browserUseUrl = taskObj.session.url;
            console.log('[Recommendations API] Found URL in task.session.url');
          } else if (taskObj?.id) {
            const baseUrl = process.env.BROWSER_USE_BASE_URL || 'https://browser-use.com';
            browserUseUrl = `${baseUrl}/tasks/${taskObj.id}`;
            console.log('[Recommendations API] Constructed URL from task ID:', browserUseUrl);
          } else if (taskObj?.taskId) {
            const baseUrl = process.env.BROWSER_USE_BASE_URL || 'https://browser-use.com';
            browserUseUrl = `${baseUrl}/tasks/${taskObj.taskId}`;
            console.log('[Recommendations API] Constructed URL from task.taskId:', browserUseUrl);
          }
        } catch (e) {
          console.error('[Recommendations API] Error extracting browser-use URL:', e);
        }

        // Cache the browser-use URL for this task
        if (browserUseUrl) {
          taskBrowserUseUrls.set(task.id, browserUseUrl);
          console.log(`[Recommendations API] 💾 Cached browser-use URL: ${browserUseUrl}`);
        }

        console.log(`[Recommendations API] Browser-use URL: ${browserUseUrl || 'Not available'}`);

        // Wait for task to complete
        let result;
        try {
          result = await browserTask.complete();
          console.log(`[Recommendations API] ✅ Browser-use task completed`);
        } catch (error) {
          console.error('[Recommendations API] Error waiting for browser-use task:', error);
          throw error;
        }

        // Parse recommendations from output
        const output = result.output || '';
        console.log(`[Recommendations API] Output length: ${output.length} characters`);
        
        const suggestions = parseRecommendations(output, task.title, task.category);
        console.log(`[Recommendations API] ✅ Parsed ${suggestions.length} recommendation(s)`);

        return {
          success: true,
          suggestions,
          browserUseUrl,
          output,
        };
      } catch (error) {
        console.error('[Recommendations API] Error in task workflow:', error);
        throw error;
      }
    })();

    // Register this task as being processed
    activeTaskPromises.set(task.id, taskPromise);

    // Get browser-use URL if already available (might be available immediately)
    let browserUseUrl = taskBrowserUseUrls.get(task.id);

    // Return browser-use URL immediately (before task completes) so UI can show it right away
    return NextResponse.json({
      success: true,
      browserUseUrl: browserUseUrl,
      message: 'Browser-use session started, fetching recommendations...',
      suggestions: [], // Will be updated when complete
    });
  } catch (error) {
    console.error('[Recommendations API] ❌ Error getting recommendations:', error);
    // Clean up on error
    activeTaskPromises.delete(task.id);
    taskBrowserUseUrls.delete(task.id);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


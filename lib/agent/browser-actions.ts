/**
 * Browser Actions
 * 
 * Wrapper for browser-use SDK to perform web automation tasks.
 * Specifically handles Amazon shopping operations.
 */

import { BrowserUseClient } from 'browser-use-sdk';

// Initialize browser-use client
// Note: Browser-use SDK requires an API key from browser-use service
// This should be set in environment variables
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
 * Search Amazon and add a product to cart
 * 
 * @param productQuery - The product to search for (e.g., "girls dress")
 * @param recipient - The recipient name/type (e.g., "daughter", "son")
 * @returns Promise resolving to cart URL or confirmation message
 */
export async function searchAmazonAndAddToCart(
  productQuery: string,
  recipient: string
): Promise<{ success: boolean; cartUrl?: string; browserUseUrl?: string; message: string }> {
  const client = getBrowserUseClient();
  
  try {
    console.log(`[Browser Actions] Starting Amazon search for: ${productQuery} (recipient: ${recipient})`);
    
    // Use browser-use to navigate to Amazon and perform the task
    const taskDescription = `Navigate to amazon.com, search for "${productQuery}", select the first appropriate result, and add it to cart. Return the cart URL or confirmation message.`;
    
    // Create task using browser-use SDK
    const task = await client.tasks.createTask({
      task: taskDescription,
    });

    // Log task object structure for debugging
    console.log('[Browser Actions] Task object:', JSON.stringify(task, null, 2));
    console.log('[Browser Actions] Task object keys:', task && typeof task === 'object' ? Object.keys(task) : 'Not an object');

    // Get browser-use session URL if available (for viewing the automation in progress)
    let browserUseUrl: string | undefined;
    try {
      const taskObj = task as any;
      
      // Check various possible properties
      if (taskObj?.url) {
        browserUseUrl = taskObj.url;
        console.log('[Browser Actions] Found URL in task.url');
      } else if (taskObj?.sessionUrl) {
        browserUseUrl = taskObj.sessionUrl;
        console.log('[Browser Actions] Found URL in task.sessionUrl');
      } else if (taskObj?.session?.url) {
        browserUseUrl = taskObj.session.url;
        console.log('[Browser Actions] Found URL in task.session.url');
      } else if (taskObj?.id) {
        // Try to construct URL from task ID
        const taskId = taskObj.id;
        // Check if there's a base URL in environment
        const baseUrl = process.env.BROWSER_USE_BASE_URL || 'https://browser-use.com';
        browserUseUrl = `${baseUrl}/tasks/${taskId}`;
        console.log('[Browser Actions] Constructed URL from task ID:', browserUseUrl);
      } else if (taskObj?.taskId) {
        const taskId = taskObj.taskId;
        const baseUrl = process.env.BROWSER_USE_BASE_URL || 'https://browser-use.com';
        browserUseUrl = `${baseUrl}/tasks/${taskId}`;
        console.log('[Browser Actions] Constructed URL from task.taskId:', browserUseUrl);
      }
    } catch (e) {
      console.error('[Browser Actions] Error extracting browser-use URL:', e);
    }

    console.log(`[Browser Actions] Browser-use session URL: ${browserUseUrl || 'Not available'}`);

    // Wait for task to complete
    const result = await task.complete();
    
    // Check result object for URL as well
    if (!browserUseUrl && result) {
      try {
        const resultObj = result as any;
        if (resultObj?.url) {
          browserUseUrl = resultObj.url;
          console.log('[Browser Actions] Found URL in result.url');
        } else if (resultObj?.sessionUrl) {
          browserUseUrl = resultObj.sessionUrl;
          console.log('[Browser Actions] Found URL in result.sessionUrl');
        } else if (resultObj?.session?.url) {
          browserUseUrl = resultObj.session.url;
          console.log('[Browser Actions] Found URL in result.session.url');
        }
        console.log('[Browser Actions] Result object keys:', Object.keys(resultObj || {}));
      } catch (e) {
        console.error('[Browser Actions] Error checking result for URL:', e);
      }
    }

    // Extract cart URL from result
    const cartUrl = extractCartUrl(result.output || '');
    
    console.log(`[Browser Actions] ✅ Successfully added to cart`);
    console.log(`[Browser Actions] Cart URL: ${cartUrl || 'Not found'}`);
    console.log(`[Browser Actions] Output: ${result.output}`);
    
    return {
      success: true,
      cartUrl: cartUrl,
      browserUseUrl: browserUseUrl,
      message: cartUrl 
        ? `Successfully added ${productQuery} to Amazon cart. Cart URL: ${cartUrl}`
        : `Successfully added ${productQuery} to Amazon cart.`,
    };
  } catch (error) {
    console.error('[Browser Actions] ❌ Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Extract cart URL from browser-use result output
 * 
 * @param output - The output string from browser-use
 * @returns Cart URL if found, undefined otherwise
 */
function extractCartUrl(output: string): string | undefined {
  // Try to find Amazon cart URL in the output
  const cartUrlPattern = /https?:\/\/[^\s]*amazon[^\s]*\/cart[^\s]*/i;
  const match = output.match(cartUrlPattern);
  
  if (match) {
    return match[0];
  }
  
  // Also check for common Amazon cart URL patterns
  const patterns = [
    /https?:\/\/www\.amazon\.com\/gp\/cart\/view\.html[^\s]*/i,
    /https?:\/\/[^\s]*amazon[^\s]*\/cart[^\s]*/i,
  ];
  
  for (const pattern of patterns) {
    const urlMatch = output.match(pattern);
    if (urlMatch) {
      return urlMatch[0];
    }
  }
  
  return undefined;
}

/**
 * Test browser-use connection
 * 
 * @returns Promise resolving to true if connection works
 */
export async function testBrowserUseConnection(): Promise<boolean> {
  try {
    const client = getBrowserUseClient();
    // Simple test task
    const task = await client.tasks.createTask({
      task: 'Navigate to google.com and return the page title',
    });
    const result = await task.complete();
    return !!result.output;
  } catch (error) {
    console.error('[Browser Actions] Connection test failed:', error);
    return false;
  }
}


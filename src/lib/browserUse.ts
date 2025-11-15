/**
 * Browser-Use Service
 * 
 * Service for executing web scraping tasks using browser-use-sdk
 */

export interface ScrapeTask {
  task: string;
}

export interface ScrapeResult {
  success: boolean;
  output: string;
  taskId?: string;
  error?: string;
  message?: string;
}

/**
 * Execute a web scraping task using browser-use
 * 
 * @param taskDescription - Natural language description of the scraping task
 * @returns Promise with the scraping result
 */
export async function executeScrapeTask(taskDescription: string): Promise<ScrapeResult> {
  try {
    const response = await fetch('/api/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: taskDescription,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        output: '',
        error: data.error || 'Unknown error',
        message: data.message,
      };
    }

    return {
      success: true,
      output: data.output || '',
      taskId: data.taskId,
    };
  } catch (error) {
    console.error('Error calling scrape API:', error);
    return {
      success: false,
      output: '',
      error: 'Network error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate suggestions for a task by scraping relevant websites
 * 
 * @param taskTitle - Title of the task
 * @param taskDescription - Description of what needs to be found
 * @param category - Category of the task (shopping, booking, etc.)
 * @returns Promise with scraping result containing suggestions
 */
export async function generateSuggestionsFromWeb(
  taskTitle: string,
  taskDescription: string,
  category: 'shopping' | 'booking' | 'communication' | 'preparation'
): Promise<ScrapeResult> {
  let scrapeTask = '';

  switch (category) {
    case 'shopping':
      scrapeTask = `Search for ${taskTitle} options. ${taskDescription}. Find top 3-5 products with prices, descriptions, and purchase links. Return results in a structured format.`;
      break;
    case 'booking':
      scrapeTask = `Search for ${taskTitle} booking options. ${taskDescription}. Find available venues, restaurants, or services with prices, availability, and booking links. Return top 3-5 options.`;
      break;
    case 'communication':
      scrapeTask = `Search for ${taskTitle} tools and services. ${taskDescription}. Find communication platforms, invitation services, or messaging tools with features and links.`;
      break;
    case 'preparation':
      scrapeTask = `Search for ${taskTitle} resources and guides. ${taskDescription}. Find preparation materials, templates, or resources with descriptions and links.`;
      break;
    default:
      scrapeTask = `Search for ${taskTitle}. ${taskDescription}. Find relevant options with details and links.`;
  }

  return executeScrapeTask(scrapeTask);
}


/**
 * Environment Configuration
 * 
 * Centralized environment variable management with validation.
 * All environment variables should be imported from here.
 */

/**
 * Validate that required environment variables are set
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default value
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

// OpenAI Configuration
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Google Calendar Configuration
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GOOGLE_REDIRECT_URI = getEnv('GOOGLE_REDIRECT_URI', 'http://localhost:3000/api/auth/callback');

// VAPI Configuration (for phone calls)
// Support both legacy VAPI_API_KEY and newer VAPI_PRIVATE_API_KEY
export const VAPI_API_KEY = process.env.VAPI_API_KEY;
export const VAPI_PRIVATE_API_KEY = process.env.VAPI_PRIVATE_API_KEY;
export const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
export const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;
export const VAPI_RESTAURANT_NUMBER = process.env.VAPI_RESTAURANT_NUMBER;

// Gmail Configuration
export const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

// Google Calendar Tokens (for automatic monitoring)
export const GOOGLE_ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN;
export const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// Browser-Use Configuration (for web automation)
export const BROWSER_USE_API_KEY = process.env.BROWSER_USE_API_KEY;

// Next.js Public Configuration
export const NEXT_PUBLIC_APP_URL = getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

// Optional: Google Webhook Configuration
export const GOOGLE_WEBHOOK_SECRET = process.env.GOOGLE_WEBHOOK_SECRET;
export const WEBHOOK_URL = getEnv('WEBHOOK_URL', `${NEXT_PUBLIC_APP_URL}/api/calendar/webhook`);

/**
 * Validate that all required environment variables are set
 * Call this at application startup
 */
export function validateEnv(): void {
  const required = [
    'OPENAI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file and ensure all required variables are set.`
    );
  }
}

/**
 * Get environment configuration object
 */
export const env = {
  openai: {
    apiKey: OPENAI_API_KEY,
  },
  google: {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
    webhookSecret: GOOGLE_WEBHOOK_SECRET,
    webhookUrl: WEBHOOK_URL,
  },
  vapi: {
    // Prefer the private key if set, otherwise fall back to legacy key
    apiKey: VAPI_PRIVATE_API_KEY || VAPI_API_KEY,
    assistantId: VAPI_ASSISTANT_ID,
    phoneNumberId: VAPI_PHONE_NUMBER_ID,
    restaurantNumber: VAPI_RESTAURANT_NUMBER,
  },
  gmail: {
    refreshToken: GMAIL_REFRESH_TOKEN,
  },
  googleCalendar: {
    accessToken: GOOGLE_ACCESS_TOKEN,
    refreshToken: GOOGLE_REFRESH_TOKEN,
  },
  browserUse: {
    apiKey: BROWSER_USE_API_KEY,
  },
  nextjs: {
    appUrl: NEXT_PUBLIC_APP_URL,
  },
} as const;


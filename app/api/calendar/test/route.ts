/**
 * Calendar Test Route
 * 
 * GET /api/calendar/test
 * Simple test endpoint to verify Google Calendar integration is working
 * Returns auth URL and instructions for testing
 */

import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/integrations/google-calendar';
import { env } from '@/lib/config/env';

export async function GET() {
  try {
    // Check if credentials are configured
    const hasCredentials = !!(env.google.clientId && env.google.clientSecret);
    
    if (!hasCredentials) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar credentials not configured',
        message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env.local file',
      }, { status: 500 });
    }

    // Generate auth URL
    const authUrl = getAuthUrl();

    return NextResponse.json({
      success: true,
      message: 'Google Calendar integration is configured correctly',
      instructions: [
        '1. Visit the authUrl below to authenticate with Google',
        '2. After authentication, you will receive access_token and refresh_token',
        '3. Use these tokens to call /api/calendar/events?accessToken=YOUR_TOKEN',
        '4. Or use the tokens in your application to fetch events',
      ],
      authUrl,
      callbackUrl: env.google.redirectUri,
      endpoints: {
        getAuth: '/api/calendar/auth',
        getEvents: '/api/calendar/events?accessToken=YOUR_TOKEN',
        callback: '/api/auth/callback',
      },
    });
  } catch (error) {
    console.error('Error in calendar test:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test calendar integration',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


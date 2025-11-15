/**
 * OAuth Callback Route
 * 
 * GET /api/auth/callback
 * Handles the OAuth2 callback from Google Calendar
 * Exchanges authorization code for access and refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/integrations/google-calendar';

// Mark this route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.json(
        { error: 'OAuth authorization failed', details: error },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    console.log('[OAuth Callback] ✅ Authentication successful!');
    console.log('[OAuth Callback] Access token received');
    console.log('[OAuth Callback] Refresh token:', tokens.refresh_token ? 'Yes' : 'No');

    // Automatically create watch subscription if webhook URL is configured
    let watchSubscription = null;
    const webhookUrl = process.env.WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calendar/webhook`;
    
    if (webhookUrl && webhookUrl !== 'http://localhost:3000/api/calendar/webhook') {
      try {
        console.log('[OAuth Callback] Creating watch subscription automatically...');
        const { getCalendarClient, createWatchSubscription } = await import('@/lib/integrations/google-calendar');
        const calendarClient = getCalendarClient(tokens.access_token!, tokens.refresh_token);
        watchSubscription = await createWatchSubscription(calendarClient, webhookUrl);
        console.log('[OAuth Callback] ✅ Watch subscription created!');
      } catch (error) {
        console.error('[OAuth Callback] ⚠️  Watch subscription failed:', error);
        console.log('[OAuth Callback] You can create it manually later via /api/calendar/watch');
      }
    } else {
      console.log('[OAuth Callback] ⚠️  WEBHOOK_URL not set. Skipping watch subscription.');
      console.log('[OAuth Callback] Set WEBHOOK_URL in .env.local to enable webhooks');
    }

    // In a real app, you'd store these tokens securely (database, session, etc.)
    // For testing, we'll return them (in production, redirect to a page that stores them)
    return NextResponse.json({
      success: true,
      message: 'Authentication successful! Save these tokens securely.',
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
      watchSubscription: watchSubscription ? {
        channelId: watchSubscription.channelId,
        resourceId: watchSubscription.resourceId,
        expiration: watchSubscription.expiration,
      } : null,
      nextSteps: [
        'Use the access_token to fetch events: /api/calendar/events?accessToken=YOUR_TOKEN',
        'Create watch subscription: POST /api/calendar/watch',
        'Webhook will receive notifications at: /api/calendar/webhook',
      ],
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.json(
      { 
        error: 'Failed to complete authentication',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


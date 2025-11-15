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

    // Check if this is a Gmail authorization by checking the state parameter
    const state = searchParams.get('state');
    const isGmailAuth = state === 'gmail_auth';

    // Exchange code for tokens (use appropriate handler based on auth type)
    let tokens;
    if (isGmailAuth) {
      const { getTokensFromCode: getGmailTokensFromCode } = await import('@/lib/integrations/gmail');
      tokens = await getGmailTokensFromCode(code);
      console.log('[OAuth Callback] ✅ Gmail authentication successful!');
    } else {
      tokens = await getTokensFromCode(code);
      console.log('[OAuth Callback] ✅ Calendar authentication successful!');
    }

    console.log('[OAuth Callback] Access token received');
    console.log('[OAuth Callback] Refresh token:', tokens.refresh_token ? 'Yes' : 'No');

    // Skip watch subscription for Gmail auth
    let watchSubscription = null;
    if (!isGmailAuth) {
      // Automatically create watch subscription if webhook URL is configured
      const webhookUrl = process.env.WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calendar/webhook`;
      
      if (webhookUrl && webhookUrl !== 'http://localhost:3000/api/calendar/webhook') {
        try {
          console.log('[OAuth Callback] Creating watch subscription automatically...');
          const { getCalendarClient, createWatchSubscription } = await import('@/lib/integrations/google-calendar');
          const calendarClient = getCalendarClient(tokens.access_token!, tokens.refresh_token || undefined);
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
    }

    // NOTE: Calendar monitoring is disabled. UI handles all calendar fetching.
    // Calendar events are fetched every 5 minutes by the frontend (app/page.tsx).
    // Planning agents only work when events are shown in the UI.
    console.log('[OAuth Callback] ℹ️  Calendar monitoring disabled. UI handles all calendar fetching.');

    // In a real app, you'd store these tokens securely (database, session, etc.)
    // For testing, we'll return them (in production, redirect to a page that stores them)
    return NextResponse.json({
      success: true,
      message: isGmailAuth 
        ? 'Gmail authorization successful! Copy the refresh_token below and add it to your .env.local file as GMAIL_REFRESH_TOKEN.'
        : 'Authentication successful! Save these tokens to .env.local to enable automatic monitoring.',
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
      monitoring: {
        started: false,
        note: 'Add tokens to .env.local and restart server for persistent monitoring.',
      },
      watchSubscription: watchSubscription ? {
        channelId: watchSubscription.channelId,
        resourceId: watchSubscription.resourceId,
        expiration: watchSubscription.expiration,
      } : null,
      nextSteps: isGmailAuth ? [
        '1. Copy the refresh_token from above',
        '2. Add this line to your .env.local file:',
        `   GMAIL_REFRESH_TOKEN=${tokens.refresh_token || 'YOUR_REFRESH_TOKEN_HERE'}`,
        '3. Restart your server: npm run dev',
        '4. Try sending invitations again!',
      ] : [
        '1. Add these tokens to your .env.local file:',
        '   GOOGLE_ACCESS_TOKEN=' + tokens.access_token,
        tokens.refresh_token ? '   GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token : '   (Refresh token not provided)',
        '2. Restart your server: npm run dev',
        '3. Monitoring will start automatically on server startup',
        '4. Check status at: /api/calendar/status',
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


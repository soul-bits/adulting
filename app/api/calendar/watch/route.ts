/**
 * Calendar Watch Subscription Route
 * 
 * POST /api/calendar/watch
 * Create a watch subscription for Google Calendar webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClient, createWatchSubscription } from '@/lib/integrations/google-calendar';
import { env } from '@/lib/config/env';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, refreshToken, webhookUrl, channelId } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 401 }
      );
    }

    // Use provided webhook URL or construct from app URL
    const webhook = webhookUrl || `${env.nextjs.appUrl}/api/calendar/webhook`;

    console.log('[Watch API] Creating watch subscription...');
    console.log(`[Watch API] Webhook URL: ${webhook}`);

    const calendarClient = getCalendarClient(accessToken, refreshToken);
    const subscription = await createWatchSubscription(
      calendarClient,
      webhook,
      channelId
    );

    return NextResponse.json({
      success: true,
      message: 'Watch subscription created successfully',
      subscription: {
        channelId: subscription.channelId,
        resourceId: subscription.resourceId,
        expiration: subscription.expiration,
        webhookUrl: webhook,
      },
      note: 'Google will send notifications to the webhook URL when calendar events change',
    });
  } catch (error) {
    console.error('[Watch API] Error creating watch subscription:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create watch subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Make sure the webhook URL is publicly accessible (use ngrok for local testing)'
      },
      { status: 500 }
    );
  }
}


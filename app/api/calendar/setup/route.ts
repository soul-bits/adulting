/**
 * Calendar Setup Helper Route
 * 
 * GET /api/calendar/setup
 * Provides step-by-step instructions to set up calendar monitoring
 */

import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/integrations/google-calendar';
import { env } from '@/lib/config/env';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hasClientId = !!env.google.clientId;
  const hasClientSecret = !!env.google.clientSecret;
  const hasAccessToken = !!env.googleCalendar.accessToken;
  const hasRefreshToken = !!env.googleCalendar.refreshToken;

  const authUrl = hasClientId ? getAuthUrl() : null;

  const steps = [];

  if (!hasClientId || !hasClientSecret) {
    steps.push({
      step: 1,
      status: 'pending',
      action: 'Set OAuth credentials in .env.local',
      details: [
        'GOOGLE_CLIENT_ID=your_client_id',
        'GOOGLE_CLIENT_SECRET=your_client_secret',
        'GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback',
      ],
    });
  } else {
    steps.push({
      step: 1,
      status: 'complete',
      action: 'OAuth credentials configured',
    });
  }

  if (!hasAccessToken) {
    steps.push({
      step: 2,
      status: 'pending',
      action: 'Authenticate with Google to get access token',
      details: authUrl
        ? [
            'Visit this URL to authenticate:',
            authUrl,
            '',
            'After authentication, you will receive access_token and refresh_token.',
            'Copy these tokens and add them to .env.local',
          ]
        : ['Complete step 1 first'],
    });
  } else {
    steps.push({
      step: 2,
      status: 'complete',
      action: 'Access token configured',
    });
  }

  if (!hasAccessToken || !hasRefreshToken) {
    steps.push({
      step: 3,
      status: 'pending',
      action: 'Add tokens to .env.local',
      details: [
        'Add these lines to your .env.local file:',
        'GOOGLE_ACCESS_TOKEN=your_access_token_here',
        'GOOGLE_REFRESH_TOKEN=your_refresh_token_here',
        '',
        'Then restart your server: npm run dev',
      ],
    });
  } else {
    steps.push({
      step: 3,
      status: 'complete',
      action: 'Tokens configured in .env.local',
    });
  }

  steps.push({
    step: 4,
    status: hasAccessToken ? 'ready' : 'pending',
    action: 'Restart server and verify monitoring',
    details: [
      'After adding tokens, restart: npm run dev',
      'Check monitoring status: GET /api/calendar/status',
      'Monitoring will check for new events every 5 minutes',
    ],
  });

  return NextResponse.json({
    success: true,
    currentStatus: {
      oauthConfigured: hasClientId && hasClientSecret,
      accessTokenSet: hasAccessToken,
      refreshTokenSet: hasRefreshToken,
      monitoringReady: hasAccessToken,
    },
    steps,
    authUrl: authUrl || null,
    quickStart: hasClientId && hasClientSecret && !hasAccessToken
      ? {
          message: 'Ready to authenticate!',
          action: 'Visit the authUrl below to get your access token',
          authUrl,
        }
      : null,
    endpoints: {
      getAuth: '/api/calendar/auth',
      checkStatus: '/api/calendar/status',
      checkEvents: '/api/calendar/check',
      initMonitoring: '/api/calendar/init',
    },
  });
}


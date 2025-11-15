/**
 * Gmail OAuth Callback Route
 * 
 * GET /api/gmail/callback
 * Handles the OAuth2 callback from Gmail authorization
 * Exchanges authorization code for access and refresh tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/integrations/gmail';

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

    console.log('[Gmail Callback] ✅ Authentication successful!');
    console.log('[Gmail Callback] Access token received');
    console.log('[Gmail Callback] Refresh token:', tokens.refresh_token ? 'Yes' : 'No');

    // Return tokens in a user-friendly format
    return NextResponse.json({
      success: true,
      message: 'Gmail authorization successful! Copy the refresh_token below and add it to your .env.local file.',
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
      nextSteps: [
        '1. Copy the refresh_token from above',
        '2. Add this line to your .env.local file:',
        `   GMAIL_REFRESH_TOKEN=${tokens.refresh_token || 'YOUR_REFRESH_TOKEN_HERE'}`,
        '3. Restart your server: npm run dev',
        '4. Try sending invitations again!',
      ],
      note: 'The refresh_token is what you need. The access_token will be automatically refreshed when needed.',
    }, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error('[Gmail Callback] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to complete Gmail authentication',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


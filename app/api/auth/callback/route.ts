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
      // For testing: redirect to a page with instructions
      redirect: '/?auth=success',
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


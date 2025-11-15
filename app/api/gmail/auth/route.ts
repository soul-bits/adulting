/**
 * API Route: Gmail Authentication
 * 
 * GET /api/gmail/auth
 * Returns the OAuth2 authorization URL with Gmail send scope
 */

import { NextResponse } from 'next/server';
import { getGmailAuthUrl } from '@/lib/integrations/gmail';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authUrl = getGmailAuthUrl();
    
    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Visit this URL to authorize Gmail send permissions. After authorization, you will receive a refresh token.',
      instructions: [
        '1. Visit the authUrl above',
        '2. Authorize the application',
        '3. Copy the refresh_token from the callback response',
        '4. Add GMAIL_REFRESH_TOKEN=your_refresh_token to .env.local',
        '5. Restart your server',
      ],
    });
  } catch (error) {
    console.error('[Gmail Auth] Error generating auth URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate auth URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


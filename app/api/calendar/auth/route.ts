/**
 * API Route: Calendar Authentication
 * 
 * GET /api/calendar/auth
 * Returns the OAuth2 authorization URL
 */

import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/integrations/google-calendar';

export async function GET() {
  try {
    const authUrl = getAuthUrl();
    
    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate auth URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


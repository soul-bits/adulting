/**
 * OAuth2 Callback Route (Legacy redirect URI)
 * 
 * GET /oauth2callback
 * Redirects to the actual callback handler at /api/auth/callback
 * This handles the redirect URI configured in Google Cloud Console
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Redirect to the actual callback handler with all query parameters
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = new URL('/api/auth/callback', request.url);
  
  // Copy all query parameters
  searchParams.forEach((value, key) => {
    callbackUrl.searchParams.set(key, value);
  });
  
  return NextResponse.redirect(callbackUrl);
}


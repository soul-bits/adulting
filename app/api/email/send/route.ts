import { NextRequest, NextResponse } from 'next/server';
import { getGmailClient, sendEmail, createInvitationEmailBody, createVenueInquiryEmailBody } from '@/lib/integrations/gmail';
import { env } from '@/lib/config/env';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, body: emailBody, type, eventData, venueData } = body;

    // Validate required fields
    if (!to || (!emailBody && !type)) {
      return NextResponse.json(
        { error: 'Missing required fields: to, and either body or type' },
        { status: 400 }
      );
    }

    // Check if Gmail refresh token is configured
    if (!env.gmail.refreshToken && !env.googleCalendar.refreshToken) {
      return NextResponse.json(
        {
          error: 'Gmail not configured',
          message: 'Please set GMAIL_REFRESH_TOKEN or GOOGLE_REFRESH_TOKEN in .env.local',
        },
        { status: 500 }
      );
    }

    console.log('[Email API] Sending email...');
    console.log('[Email API] To:', to);
    console.log('[Email API] Type:', type || 'custom');

    // Get Gmail client
    const gmailClient = await getGmailClient();

    // Determine email body based on type
    let finalBody: string;
    let finalSubject: string;

    if (type === 'invitation' && eventData) {
      finalBody = createInvitationEmailBody(
        eventData.title,
        new Date(eventData.date),
        eventData.location,
        eventData.description
      );
      finalSubject = subject || `Invitation: ${eventData.title}`;
    } else if (type === 'venue-inquiry' && venueData && eventData) {
      finalBody = createVenueInquiryEmailBody(
        venueData.name,
        eventData.title,
        new Date(eventData.date),
        eventData.description
      );
      finalSubject = subject || `Venue Inquiry: ${eventData.title}`;
    } else {
      // Use provided body or default
      finalBody = emailBody || 'No content provided';
      finalSubject = subject || 'Email from Alfred';
    }

    // Send email
    const result = await sendEmail(
      gmailClient,
      to,
      finalSubject,
      finalBody
    );

    console.log('[Email API] ✅ Email sent successfully');
    console.log('[Email API] Message ID:', result.id);

    return NextResponse.json({
      success: true,
      messageId: result.id,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('[Email API] Error sending email:', error);

    // Provide helpful error messages
    if (error instanceof Error) {
      // Check for insufficient permissions error
      if (error.message.includes('Insufficient Permission') || 
          error.message.includes('insufficient') ||
          error.message.includes('403') ||
          (error as any).code === 403) {
        return NextResponse.json(
          {
            error: 'Insufficient Permission',
            message: 'Your refresh token does not have Gmail send permissions. You need to authorize with Gmail scopes.',
            solution: 'Get a new refresh token with Gmail permissions',
            authUrl: '/api/gmail/auth',
            instructions: [
              '1. Visit /api/gmail/auth to get authorization URL',
              '2. Authorize the application with Gmail send permissions',
              '3. Copy the refresh_token from the callback',
              '4. Add GMAIL_REFRESH_TOKEN=your_refresh_token to .env.local',
              '5. Restart your server',
            ],
          },
          { status: 403 }
        );
      }

      if (error.message.includes('refresh_token') || error.message.includes('token')) {
        return NextResponse.json(
          {
            error: 'Authentication failed',
            message: 'Gmail refresh token is invalid or expired. Please update GMAIL_REFRESH_TOKEN in .env.local',
            authUrl: '/api/gmail/auth',
          },
          { status: 401 }
        );
      }

      if (error.message.includes('not configured')) {
        return NextResponse.json(
          {
            error: 'Gmail not configured',
            message: error.message,
            authUrl: '/api/gmail/auth',
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to send email',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


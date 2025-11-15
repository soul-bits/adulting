/**
 * Gmail Integration
 * 
 * Handles OAuth2 authentication and API interactions with Gmail.
 * This module provides functions to send emails via Gmail API.
 */

import { google } from 'googleapis';
import { env } from '@/lib/config/env';

/**
 * OAuth2 client configuration
 * Uses environment variables from centralized config
 */
function getOAuth2Client() {
  const clientId = env.google.clientId;
  const clientSecret = env.google.clientSecret;
  const redirectUri = env.google.redirectUri;

  if (!clientId || !clientSecret) {
    throw new Error('Google credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Get authenticated Gmail client
 * @param refreshToken - OAuth2 refresh token
 */
export async function getGmailClient(refreshToken?: string) {
  const auth = getOAuth2Client();
  
  // Use refresh token from env if not provided
  const token = refreshToken || env.gmail.refreshToken || env.googleCalendar.refreshToken;
  
  if (!token) {
    throw new Error('Gmail refresh token not configured. Please set GMAIL_REFRESH_TOKEN or GOOGLE_REFRESH_TOKEN');
  }

  auth.setCredentials({
    refresh_token: token,
  });

  // Refresh access token to ensure it's valid
  try {
    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);
  } catch (error) {
    console.error('[Gmail] Error refreshing access token:', error);
    throw new Error('Failed to refresh Gmail access token. Please check your refresh token.');
  }

  return google.gmail({ version: 'v1', auth });
}

/**
 * Get authorization URL for Gmail OAuth2 flow
 * @param scopes - Array of Google API scopes (defaults to Gmail send scope)
 */
export function getGmailAuthUrl(scopes: string[] = [
  'https://www.googleapis.com/auth/gmail.send',
]) {
  const oauth2Client = getOAuth2Client();
  // Use the same redirect URI as configured (will work with /api/auth/callback)
  // Include state parameter to identify this as Gmail auth
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force consent to get refresh token
    state: 'gmail_auth', // State parameter to identify Gmail authorization
  });
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from OAuth2 callback
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - OAuth2 refresh token
 */
export async function refreshAccessToken(refreshToken?: string) {
  const oauth2Client = getOAuth2Client();
  const token = refreshToken || env.gmail.refreshToken || env.googleCalendar.refreshToken;
  
  if (!token) {
    throw new Error('Gmail refresh token not configured');
  }

  oauth2Client.setCredentials({ refresh_token: token });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

/**
 * Send an email via Gmail API
 * @param gmailClient - Authenticated Gmail client
 * @param to - Recipient email address(es)
 * @param subject - Email subject
 * @param body - Email body (HTML or plain text)
 * @param from - Sender email address (optional, uses authenticated user's email if not provided)
 */
export async function sendEmail(
  gmailClient: Awaited<ReturnType<typeof getGmailClient>>,
  to: string | string[],
  subject: string,
  body: string,
  from?: string
) {
  // Get the authenticated user's email if from is not provided
  if (!from) {
    const profile = await gmailClient.users.getProfile({ userId: 'me' });
    from = profile.data.emailAddress || '';
  }

  // Convert to array if single email
  const recipients = Array.isArray(to) ? to : [to];

  // Create email message in RFC 2822 format
  const emailLines = [
    `From: ${from}`,
    `To: ${recipients.join(', ')}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    body,
  ];

  const email = emailLines.join('\r\n');

  // Encode email in base64url format
  const encodedEmail = Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  console.log('[Gmail] Sending email...');
  console.log(`[Gmail] To: ${recipients.join(', ')}`);
  console.log(`[Gmail] Subject: ${subject}`);

  const response = await gmailClient.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
    },
  });

  console.log('[Gmail] ✅ Email sent successfully');
  console.log(`[Gmail] Message ID: ${response.data.id}`);

  return response.data;
}

/**
 * Create HTML email body for event invitations
 * @param eventTitle - Event title
 * @param eventDate - Event date
 * @param eventLocation - Event location (optional)
 * @param eventDescription - Event description (optional)
 */
export function createInvitationEmailBody(
  eventTitle: string,
  eventDate: Date,
  eventLocation?: string,
  eventDescription?: string
): string {
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { margin: 10px 0; }
        .label { font-weight: bold; color: #667eea; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 You're Invited!</h1>
        </div>
        <div class="content">
          <p>You've been invited to:</p>
          <div class="event-details">
            <div class="detail-row">
              <span class="label">Event:</span> ${eventTitle}
            </div>
            <div class="detail-row">
              <span class="label">Date & Time:</span> ${formattedDate}
            </div>
            ${eventLocation ? `<div class="detail-row"><span class="label">Location:</span> ${eventLocation}</div>` : ''}
            ${eventDescription ? `<div class="detail-row"><span class="label">Description:</span> ${eventDescription}</div>` : ''}
          </div>
          <p>We hope to see you there!</p>
        </div>
        <div class="footer">
          <p>This invitation was sent by Alfred, your personal assistant.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create HTML email body for venue inquiry
 * @param venueName - Venue name
 * @param eventTitle - Event title
 * @param eventDate - Event date
 * @param eventDetails - Additional event details
 */
export function createVenueInquiryEmailBody(
  venueName: string,
  eventTitle: string,
  eventDate: Date,
  eventDetails?: string
): string {
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { margin: 10px 0; }
        .label { font-weight: bold; color: #10b981; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Venue Inquiry</h1>
        </div>
        <div class="content">
          <p>Hello ${venueName} team,</p>
          <p>I am interested in booking your venue for the following event:</p>
          <div class="event-details">
            <div class="detail-row">
              <span class="label">Event:</span> ${eventTitle}
            </div>
            <div class="detail-row">
              <span class="label">Date & Time:</span> ${formattedDate}
            </div>
            ${eventDetails ? `<div class="detail-row"><span class="label">Details:</span> ${eventDetails}</div>` : ''}
          </div>
          <p>Could you please provide information about availability and pricing?</p>
          <p>Thank you!</p>
        </div>
        <div class="footer">
          <p>This inquiry was sent by Alfred, your personal assistant.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}


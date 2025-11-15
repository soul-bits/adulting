/**
 * API Route: Reserve Call via Vapi
 * 
 * POST /api/call/reserve
 * Initiates an outbound phone call using Vapi to make a restaurant reservation
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { env } from '@/lib/config/env';

export const dynamic = 'force-dynamic';

class VoiceCallConfigurationError extends Error {}
class VoiceCallRequestError extends Error {}

/**
 * Normalize phone number to E.164 format (US fallback)
 */
function normalizePhoneNumber(rawNumber: string): string {
  if (!rawNumber) {
    throw new VoiceCallRequestError('Phone number is required for a voice call.');
  }

  const sanitized = rawNumber.trim();

  // Already starts with + → clean non-digits but keep +
  if (sanitized.startsWith('+')) {
    const digits = sanitized.replace(/[^0-9]/g, '');
    if (digits.length < 8) {
      throw new VoiceCallRequestError('Phone number appears incomplete.');
    }
    return `+${digits}`;
  }

  // Remove everything except digits
  const digitsOnly = sanitized.replace(/[^0-9]/g, '');

  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }

  throw new VoiceCallRequestError('Unable to normalize phone number to E.164 format.');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      date,           // Reservation date (e.g., "2025-02-15")
      time,          // Reservation time (e.g., "7:30 PM")
      people,        // Number of people
      restaurantPhone, // Restaurant phone number (optional, falls back to env)
      venueName,     // Venue/restaurant name (optional, for context)
    } = body;

    // Validate required fields
    if (!date || !time || !people) {
      return NextResponse.json(
        { error: 'Missing required fields: date, time, and people are required' },
        { status: 400 }
      );
    }

    // Validate Vapi configuration
    if (!env.vapi.apiKey) {
      return NextResponse.json(
        { 
          error: 'Vapi configuration error',
          message: 'VAPI_PRIVATE_API_KEY is not configured.'
        },
        { status: 500 }
      );
    }
    
    if (!env.vapi.assistantId) {
      return NextResponse.json(
        { 
          error: 'Vapi configuration error',
          message: 'VAPI_ASSISTANT_ID is not configured.'
        },
        { status: 500 }
      );
    }

    // Use restaurant phone from request, or fall back to environment variable
    const rawPhoneNumber = restaurantPhone || env.vapi.restaurantNumber;
    const overrideCustomerNumber = process.env.VAPI_TARGET_PHONE_NUMBER;
    
    if (!rawPhoneNumber && !overrideCustomerNumber) {
      return NextResponse.json(
        { 
          error: 'Restaurant phone number not provided',
          message: 'Either provide restaurantPhone in request body or set VAPI_RESTAURANT_NUMBER in .env.local'
        },
        { status: 400 }
      );
    }

    // Normalize phone number to E.164 format, preferring override target if set
    let customerNumber: string;
    try {
      if (overrideCustomerNumber) {
        try {
          customerNumber = normalizePhoneNumber(overrideCustomerNumber);
        } catch {
          // Fallback to restaurant phone if override is invalid
          customerNumber = normalizePhoneNumber(rawPhoneNumber || '');
        }
      } else {
        customerNumber = normalizePhoneNumber(rawPhoneNumber!);
      }
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Invalid phone number format',
          message: error instanceof Error ? error.message : 'Unable to normalize phone number'
        },
        { status: 400 }
      );
    }

    const baseUrl = (process.env.VAPI_API_BASE_URL || 'https://api.vapi.ai').replace(/\/$/, '');

    console.log('[Vapi Call] Initiating reservation call...');
    console.log('[Vapi Call] Date:', date);
    console.log('[Vapi Call] Time:', time);
    console.log('[Vapi Call] People:', people);
    console.log('[Vapi Call] Restaurant (normalized):', customerNumber);
    if (venueName) {
      console.log('[Vapi Call] Venue:', venueName);
    }

    // Prepare metadata for the assistant
    const metadata: Record<string, any> = {
      reservation_date: date,
      reservation_time: time,
      reservation_people: people,
      originalPhoneNumber: rawPhoneNumber,
      dialedPhoneNumber: customerNumber,
    };

    if (venueName) {
      metadata.venue_name = venueName;
    }

    // Build the payload for Vapi API
    const payload: any = {
      assistantId: env.vapi.assistantId!,
      customer: {
        number: customerNumber,
        ...(venueName && { name: venueName }),
      },
      metadata,
    };

    // Which number does Vapi use to place call?
    if (env.vapi.phoneNumberId) {
      payload.phoneNumberId = env.vapi.phoneNumberId;
    } else {
      return NextResponse.json(
        { 
          error: 'Vapi configuration error',
          message: 'Configure VAPI_PHONE_NUMBER_ID to place calls.'
        },
        { status: 500 }
      );
    }

    console.log('[Vapi Call] Making API request to:', `${baseUrl}/call`);
    console.log('[Vapi Call] Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post(`${baseUrl}/call`, payload, {
        headers: {
          Authorization: `Bearer ${env.vapi.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const data = response.data;
      const callId = data.id || data.call?.id;

      console.log('[Vapi Call] ✅ Call initiated successfully');
      console.log('[Vapi Call] Call ID:', callId);
      console.log('[Vapi Call] Full response:', JSON.stringify(data, null, 2));

      return NextResponse.json({
        success: true,
        callId,
        payload: data,
        message: `Initiated voice call to ${customerNumber}`,
        metadata: {
          date,
          time,
          people,
          restaurantPhone: customerNumber,
        },
      });
    } catch (err: any) {
      const detail = err?.response?.data || err.message;
      const statusCode = err?.response?.status || 500;
      
      console.error('[Vapi Call] API Error:', {
        status: statusCode,
        detail,
        message: err.message,
      });

      return NextResponse.json(
        {
          error: 'Failed to place call',
          message: `Vapi call failed with status ${statusCode}: ${JSON.stringify(detail)}`,
          details: detail,
        },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error('[Vapi Call] Error placing call:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to place call',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


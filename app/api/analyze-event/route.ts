/**
 * API Route: Analyze Event
 * 
 * POST /api/analyze-event
 * Analyzes a calendar event and returns analysis results including:
 * - Event type
 * - Required actions
 * - Missing information
 * - Generated questions
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeEvent } from '@/lib/agent/event-analyzer';
import { generateQuestions } from '@/lib/agent/question-generator';
import { EventType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event: Partial<EventType> = body.event;

    if (!event || !event.title) {
      return NextResponse.json(
        { error: 'Event data is required' },
        { status: 400 }
      );
    }

    // Analyze the event
    const analysis = await analyzeEvent(event);

    // Generate questions based on missing info
    const questions = await generateQuestions(event, analysis.missingInfo);

    return NextResponse.json({
      success: true,
      analysis: {
        eventType: analysis.eventType,
        context: analysis.context,
        requiredActions: analysis.requiredActions,
        missingInfo: analysis.missingInfo,
      },
      questions: questions.filter(q => q), // Filter out empty questions
    });
  } catch (error) {
    console.error('Error analyzing event:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze event',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


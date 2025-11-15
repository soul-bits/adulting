/**
 * API Route: Plan Event
 * 
 * POST /api/events/plan
 * Analyzes a BIRTHDAY event and generates tasks if not already planned.
 * This is the main planning agent entry point.
 * 
 * NOTE: Only processes birthday events. Other event types are skipped.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateTasks } from '@/lib/agent/task-planner';
import { analyzeEvent } from '@/lib/agent/event-analyzer';
import { EventType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let eventId: string | null = null;
  let eventTitle: string | null = null;
  
  try {
    const body = await request.json();
    const event: EventType = body.event;
    eventId = event?.id || null;
    eventTitle = event?.title || null;

    if (!event || !event.id || !event.title) {
      return NextResponse.json(
        { error: 'Event data is required' },
        { status: 400 }
      );
    }

    // Convert date string to Date object if needed
    let eventDate: Date;
    if (event.date instanceof Date) {
      eventDate = event.date;
    } else if (typeof event.date === 'string') {
      eventDate = new Date(event.date);
      // Validate date
      if (isNaN(eventDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Event date is required' },
        { status: 400 }
      );
    }

    const eventWithDate: EventType = {
      ...event,
      date: eventDate,
    };

    console.log(`[Planning Agent] 🎯 Checking event: "${eventWithDate.title}" (ID: ${eventWithDate.id})`);

    // Check if event is in the future - skip planning for past events
    const now = new Date();
    if (eventWithDate.date < now) {
      console.log(`[Planning Agent] ⏭️  Event "${eventWithDate.title}" is in the past (${eventWithDate.date.toISOString()}). Skipping planning.`);
      return NextResponse.json({
        success: false,
        skipped: true,
        message: 'Event is in the past. Only future events are planned.',
        eventDate: eventWithDate.date.toISOString(),
        tasks: [],
      });
    }

    // CRITICAL: Check if event already has tasks - if so, do NOT modify anything
    if (eventWithDate.tasks && eventWithDate.tasks.length > 0) {
      console.log(`[Planning Agent] ⏭️  Event ${eventWithDate.id} already has ${eventWithDate.tasks.length} task(s), skipping planning (no changes)`);
      return NextResponse.json({
        success: true,
        alreadyPlanned: true,
        message: 'Event already has tasks - no changes made',
        tasks: eventWithDate.tasks,
      });
    }

    // Analyze the event to determine type
    console.log(`[Planning Agent] 🔍 Analyzing event...`);
    const analysis = await analyzeEvent(eventWithDate);
    console.log(`[Planning Agent] Event type: ${analysis.eventType}`);

    // ONLY process birthday events
    if (analysis.eventType !== 'birthday') {
      console.log(`[Planning Agent] ⏭️  Event is "${analysis.eventType}", not birthday. Skipping planning.`);
      return NextResponse.json({
        success: true,
        skipped: true,
        message: `Event is ${analysis.eventType}, not birthday. Only birthday events are planned.`,
        eventType: analysis.eventType,
        tasks: [],
      });
    }

    console.log(`[Planning Agent] 🎂 Birthday event detected! Proceeding with planning...`);
    console.log(`[Planning Agent] Context: ${analysis.context}`);
    console.log(`[Planning Agent] Required actions: ${analysis.requiredActions.join(', ') || 'None'}`);
    console.log(`[Planning Agent] Missing info: ${analysis.missingInfo.join(', ') || 'None'}`);

    // Generate tasks based on analysis
    console.log(`[Planning Agent] 📋 Generating tasks...`);
    const tasks = await generateTasks(eventWithDate, {});
    console.log(`[Planning Agent] ✅ Generated ${tasks.length} task(s)`);
    tasks.forEach((task, index) => {
      console.log(`[Planning Agent]   ${index + 1}. ${task.title} (${task.category})`);
    });

    return NextResponse.json({
      success: true,
      alreadyPlanned: false,
      analysis: {
        eventType: analysis.eventType,
        context: analysis.context,
        requiredActions: analysis.requiredActions,
        missingInfo: analysis.missingInfo,
      },
      tasks,
      message: `Generated ${tasks.length} task(s) for birthday event`,
    });
  } catch (error) {
    console.error('[Planning Agent] ❌ Error planning event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to plan event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


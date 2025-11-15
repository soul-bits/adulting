/**
 * API Route: Process Birthday Event
 * 
 * POST /api/events/process-birthday
 * Processes a birthday event server-side (since browser-use and file system operations require Node.js)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processBirthdayEvent, shouldProcessBirthdayEvent } from '@/lib/agent/birthday-agent';
import { EventType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event: EventType = body.event;

    if (!event || !event.id || !event.title) {
      return NextResponse.json(
        { error: 'Event data is required' },
        { status: 400 }
      );
    }

    // Convert date string to Date object if needed
    const eventWithDate: EventType = {
      ...event,
      date: event.date instanceof Date ? event.date : new Date(event.date),
    };

    // Check if event is in the future - skip processing for past events
    const now = new Date();
    if (eventWithDate.date < now) {
      console.log(`[Birthday Agent API] ⏭️  Event "${eventWithDate.title}" is in the past (${eventWithDate.date.toISOString()}). Skipping processing.`);
      return NextResponse.json({
        success: false,
        message: 'Event is in the past. Only future events are processed.',
        processed: false,
      });
    }

    // Check if this is a birthday event that should be processed
    const shouldProcess = await shouldProcessBirthdayEvent(eventWithDate);
    
    if (!shouldProcess) {
      console.log(`[API] Event ${eventWithDate.id} should not be processed by birthday agent`);
      return NextResponse.json({
        success: false,
        message: 'Event is not a birthday event or has already been processed',
        processed: false,
      });
    }

    // Additional check: Verify event doesn't already have a birthday task
    const hasBirthdayTask = eventWithDate.tasks?.some(task => 
      task.id.startsWith(`task-birthday-dress-${eventWithDate.id}`)
    );
    
    if (hasBirthdayTask) {
      console.log(`[API] Event ${eventWithDate.id} already has birthday task, skipping browser-use call`);
      return NextResponse.json({
        success: false,
        message: 'Event already has a birthday task',
        processed: false,
      });
    }

    // Process the birthday event
    let createdTask: any = null;
    let finalTask: any = null;

    await processBirthdayEvent(
      eventWithDate,
      // onTaskCreated callback
      (task) => {
        createdTask = task;
        finalTask = task;
      },
      // onTaskUpdated callback
      (taskId, updates) => {
        // Merge updates into the created task
        if (createdTask && createdTask.id === taskId) {
          finalTask = { ...createdTask, ...updates };
        } else {
          finalTask = { id: taskId, ...updates };
        }
      }
    );

    // Note: Birthday agent task is saved by processBirthdayEvent itself

    return NextResponse.json({
      success: true,
      message: 'Birthday event processed successfully',
      task: finalTask || createdTask,
    });
  } catch (error) {
    console.error('[API] Error processing birthday event:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process birthday event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


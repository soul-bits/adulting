/**
 * API Route: Generate Tasks
 * 
 * POST /api/tasks/generate
 * Generates tasks for an event based on analysis and question responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateTasks } from '@/lib/agent/task-planner';
import { EventType } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, questionResponses } = body;

    if (!event) {
      return NextResponse.json(
        { error: 'Event data is required' },
        { status: 400 }
      );
    }

    const tasks = await generateTasks(event, questionResponses || {});

    return NextResponse.json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error('Error generating tasks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate tasks',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


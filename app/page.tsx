'use client';

import { useState, useEffect, useRef } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { EventWorkflow } from '@/components/EventWorkflow';
import { TaskTracking } from '@/components/TaskTracking';
import { ApprovalPanel } from '@/components/ApprovalPanel';
import { AlfredChat } from '@/components/AlfredChat';
import { EventType, Notification, ViewType, Task } from '@/lib/types';

/**
 * Home page - displays the main dashboard and handles navigation
 * 
 * This page manages the main application state and routes between different views.
 * Fetches calendar events from the API on mount.
 */
export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch calendar events from API
  const [events, setEvents] = useState<EventType[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch calendar events on component mount and every 5 minutes
  // NOTE: This is the ONLY place calendar events are fetched automatically.
  // Background monitoring is disabled - all calendar fetching happens here in the UI.
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[Page] 📅 Fetching calendar events...');
        const response = await fetch('/api/calendar/events');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch calendar events');
        }
        
        if (data.success && data.events) {
          // Convert date strings to Date objects and ensure tasks array exists
          const eventsWithDates = data.events.map((event: any) => ({
            ...event,
            date: event.date ? new Date(event.date) : new Date(),
            tasks: event.tasks || [], // Ensure tasks array exists
          }));
          setEvents(eventsWithDates);
          console.log(`[Page] ✅ Loaded ${eventsWithDates.length} event(s)`);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error('Error fetching calendar events:', err);
        setError(err instanceof Error ? err.message : 'Failed to load calendar events');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    
    // Fetch immediately on mount
    fetchEvents();
    
    // Then fetch every 5 minutes (300000ms) - this is the ONLY automatic calendar fetching
    const intervalId = setInterval(() => {
      console.log('[Page] 🔄 Refreshing calendar events (5 min interval)...');
      fetchEvents();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Sequential agent processing: Planning first, then Birthday agent
  // Use ref to track processed event IDs to prevent unnecessary re-runs
  const processedEventIdsRef = useRef<Set<string>>(new Set());
  const lastEventIdsRef = useRef<Set<string>>(new Set());
  const birthdayAgentProcessedRef = useRef<Set<string>>(new Set()); // Track events processed by birthday agent
  
  useEffect(() => {
    console.log('[Page] 🔍 Agent processing effect triggered:', { loading, eventsCount: events.length });
    
    // Only process when loading completes and we have events
    if (loading) {
      console.log('[Page] ⏸️  Still loading, skipping agent processing');
      return;
    }
    
    if (events.length === 0) {
      console.log('[Page] ⏸️  No events yet, skipping agent processing');
      return;
    }

    console.log('[Page] ✅ Conditions met - will process agents for', events.length, 'event(s)');

    async function processAgentsSequentially() {
      // Get current event IDs
      const currentEventIds = new Set(events.map(e => e.id));
      
      // Detect NEW events (events that weren't in the last set)
      const newEventIds = Array.from(currentEventIds).filter(id => !lastEventIdsRef.current.has(id));
      
      // Check if this is just a task update (same event IDs, but events have tasks now)
      const isTaskUpdate = newEventIds.length === 0 && 
                           currentEventIds.size === lastEventIdsRef.current.size &&
                           currentEventIds.size > 0 &&
                           Array.from(currentEventIds).every(id => lastEventIdsRef.current.has(id));
      
      // If this is just a task update and all events are processed, skip to avoid re-processing
      if (isTaskUpdate && Array.from(currentEventIds).every(id => processedEventIdsRef.current.has(id))) {
        console.log('[Page] ⏭️  Events updated with tasks, but all already processed - skipping');
        return;
      }
      
      // If no new events and all events are already processed, skip
      if (newEventIds.length === 0 && currentEventIds.size > 0 && Array.from(currentEventIds).every(id => processedEventIdsRef.current.has(id))) {
        console.log('[Page] ⏭️  No new events to process, all events already processed');
        // Update last seen event IDs even if skipping
        lastEventIdsRef.current = currentEventIds;
        return;
      }
      
      // Log new events detected
      if (newEventIds.length > 0) {
        console.log(`[Page] 🎯 Detected ${newEventIds.length} new event(s) - will check for birthdays:`, newEventIds);
      } else if (currentEventIds.size > 0) {
        console.log(`[Page] 🔄 Checking ${currentEventIds.size} existing event(s) for unprocessed birthdays`);
      }
      
      // Update last seen event IDs AFTER we've determined we need to process
      // This prevents race conditions where events update before processing completes
      lastEventIdsRef.current = currentEventIds;

      console.log('[Page] 🤖 Starting sequential agent processing...');

      // STEP 1: Planning Agent - Generate tasks for birthday events
      console.log('[Page] 📋 Step 1: Planning Agent - Checking for birthday events to plan...');
      
      // Track updated events as we process them
      const updatedEvents = new Map<string, EventType>();
      events.forEach((event: EventType) => updatedEvents.set(event.id, event));

      // Process events - prioritize new events, but also check existing events that haven't been processed
      const eventsToProcess = events.filter(event => {
        // Process if it's a new event OR if it hasn't been processed yet
        return newEventIds.includes(event.id) || !processedEventIdsRef.current.has(event.id);
      });

      for (const event of eventsToProcess) {
        try {
          // CRITICAL: Skip if event already has tasks - do NOT modify existing tasks
          if (event.tasks && event.tasks.length > 0) {
            console.log(`[Page] ⏭️  Planning: Event "${event.title}" already has ${event.tasks.length} task(s), skipping`);
            // Mark as processed even if it has tasks (to avoid re-checking)
            processedEventIdsRef.current.add(event.id);
            continue;
          }

          // Skip if already processed (double-check)
          if (processedEventIdsRef.current.has(event.id)) {
            console.log(`[Page] ⏭️  Planning: Event "${event.title}" already processed, skipping`);
            continue;
          }

          // Quick check: only process events that might be birthdays
          const titleLower = event.title.toLowerCase();
          const mightBeBirthday = titleLower.includes('birthday') || 
                                  titleLower.includes('birth') ||
                                  event.type === 'birthday';

          if (!mightBeBirthday) {
            console.log(`[Page] ⏭️  Planning: Event "${event.title}" doesn't appear to be a birthday, skipping`);
            // Mark non-birthday events as processed to avoid re-checking
            processedEventIdsRef.current.add(event.id);
            continue;
          }

          console.log(`[Page] 🎯 Planning: Processing "${event.title}"`);
          
          // Set planning status to 'planning'
          setEvents((prevEvents: EventType[]) =>
            prevEvents.map((e: EventType) =>
              e.id === event.id ? { ...e, planningStatus: 'planning' as const } : e
            )
          );
          
          // Call planning API route (will verify it's a birthday event)
          const response = await fetch('/api/events/plan', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ event }),
          });

          const data = await response.json();

          if (data.success && data.tasks && data.tasks.length > 0) {
            // Mark as processed
            processedEventIdsRef.current.add(event.id);
            
            // Update local tracking with new tasks
            const updatedEvent = {
              ...event,
              tasks: [...(event.tasks || []), ...data.tasks],
              planningStatus: 'completed' as const
            };
            updatedEvents.set(event.id, updatedEvent);

            // Update state
            setEvents((prevEvents: EventType[]) =>
              prevEvents.map((e: EventType) => {
                if (e.id === event.id) {
                  // Double-check: don't modify if tasks already exist
                  if (e.tasks && e.tasks.length > 0) {
                    console.log(`[Page] ⚠️  Planning: Event "${event.title}" already has tasks, not modifying`);
                    return { ...e, planningStatus: 'completed' as const };
                  }
                  return updatedEvent;
                }
                return e;
              })
            );
            console.log(`[Page] ✅ Planning: Generated ${data.tasks.length} task(s) for "${event.title}"`);
          } else if (data.alreadyPlanned) {
            processedEventIdsRef.current.add(event.id);
            // Update planning status to completed
            setEvents((prevEvents: EventType[]) =>
              prevEvents.map((e: EventType) =>
                e.id === event.id ? { ...e, planningStatus: 'completed' as const } : e
              )
            );
            console.log(`[Page] ⏭️  Planning: Event "${event.title}" already planned`);
          } else if (data.skipped) {
            // Mark as completed (not a birthday, so planning is done)
            setEvents((prevEvents: EventType[]) =>
              prevEvents.map((e: EventType) =>
                e.id === event.id ? { ...e, planningStatus: 'completed' as const } : e
              )
            );
            console.log(`[Page] ⏭️  Planning: Event "${event.title}" is ${data.eventType}, not birthday - skipped`);
          } else {
            // Mark as error
            setEvents((prevEvents: EventType[]) =>
              prevEvents.map((e: EventType) =>
                e.id === event.id ? { ...e, planningStatus: 'error' as const } : e
              )
            );
            console.log(`[Page] ⚠️  Planning: No tasks generated for "${event.title}": ${data.message || 'Unknown reason'}`);
          }
        } catch (error) {
          console.error(`[Page] ❌ Planning: Error planning event "${event.title}":`, error);
          // Mark as error on exception
          setEvents((prevEvents: EventType[]) =>
            prevEvents.map((e: EventType) =>
              e.id === event.id ? { ...e, planningStatus: 'error' as const } : e
            )
          );
        }
      }

      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 300));

      // STEP 2: Birthday Agent - Process birthday events with browser-use
      // CRITICAL: Only process events that have tasks from planning AND haven't been processed by birthday agent
      console.log('[Page] 🎂 Step 2: Birthday Agent - Processing birthday events...');

      // Process events using updated events map
      for (const [eventId, event] of updatedEvents.entries()) {
        try {
          // CRITICAL: Skip if already processed by birthday agent (prevents duplicate browser-use calls)
          if (birthdayAgentProcessedRef.current.has(event.id)) {
            console.log(`[Page] ⏭️  Birthday Agent: Event "${event.title}" already processed by birthday agent (tracked), skipping`);
            continue;
          }

          // Check if birthday agent already processed this event (by checking for task)
          const birthdayTaskExists = event.tasks?.some(task => 
            task.id.startsWith(`task-birthday-dress-${event.id}`)
          );
          
          if (birthdayTaskExists) {
            console.log(`[Page] ⏭️  Birthday Agent: Event "${event.title}" already has birthday task, marking as processed`);
            birthdayAgentProcessedRef.current.add(event.id);
            continue;
          }

          // Check if it's a birthday event
          const isBirthday = event.type === 'birthday' || 
                            event.title.toLowerCase().includes('birthday');
          
          if (!isBirthday) {
            continue;
          }

          // Only process if event has tasks from planning
          if (!event.tasks || event.tasks.length === 0) {
            console.log(`[Page] ⏭️  Birthday Agent: Event "${event.title}" has no tasks from planning, skipping`);
            continue;
          }

          // Mark as being processed BEFORE making the API call to prevent duplicate calls
          birthdayAgentProcessedRef.current.add(event.id);
          console.log(`[Page] 🎯 Birthday Agent: Processing "${event.title}" (browser-use will be called)`);
          
          const response = await fetch('/api/events/process-birthday', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ event }),
          });

          const data = await response.json();

          if (data.success && data.task) {
            // Add/update task in event
            const task = data.task;
            setEvents((prevEvents: EventType[]) =>
              prevEvents.map((e: EventType) =>
                e.id === event.id
                  ? { 
                      ...e, 
                      tasks: e.tasks.some((t: Task) => t.id === task.id) 
                        ? e.tasks.map((t: Task) => t.id === task.id ? { ...t, ...task } : t)
                        : [...e.tasks, task]
                    }
                  : e
              )
            );
            console.log(`[Page] ✅ Birthday Agent: Task created/updated for "${event.title}"`);
          } else if (data.processed === false) {
            console.log(`[Page] ⏭️  Birthday Agent: Event "${event.title}" already processed or not a birthday event`);
            // Keep it marked as processed to prevent retries
          } else {
            // On error, remove from processed set to allow retry (optional - you might want to keep it)
            // birthdayAgentProcessedRef.current.delete(event.id);
            console.log(`[Page] ⚠️  Birthday Agent: Failed to process "${event.title}": ${data.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error(`[Page] ❌ Birthday Agent: Error processing "${event.title}":`, error);
          // On exception, remove from processed set to allow retry (optional)
          // birthdayAgentProcessedRef.current.delete(event.id);
          // Continue processing other events even if one fails
        }
      }

      console.log('[Page] ✅ Sequential agent processing complete');
    }

    // Trigger processing after a short delay when loading completes
    // This ensures new birthday events are detected and processed when they appear in the UI
    const timer = setTimeout(() => {
      processAgentsSequentially();
    }, 1000);

    return () => clearTimeout(timer);
  }, [loading, events]); // Depend on events array to detect when new events are added (like birthdays from calendar fetch)

  const handleEventSelect = (event: EventType) => {
    setSelectedEvent(event);
    setCurrentView('event');
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    setSelectedEvent(null);
  };

  const handleTaskUpdate = (eventId: string, taskId: string, newStatus: Task['status']) => {
    setEvents((prevEvents: EventType[]) =>
      prevEvents.map((event: EventType) =>
        event.id === eventId
          ? {
              ...event,
              tasks: event.tasks.map((task: Task) =>
                task.id === taskId ? { ...task, status: newStatus } : task
              )
            }
          : event
      )
    );
  };

  const handleDismissNotification = (notificationId: string) => {
    setNotifications((prev: Notification[]) => prev.filter((n: Notification) => n.id !== notificationId));
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedEvent(null);
  };

  // Render appropriate view based on currentView state
  if (currentView === 'dashboard') {
    return (
      <>
        <Dashboard
          events={events}
          notifications={notifications}
          loading={loading}
          error={error}
          onEventSelect={handleEventSelect}
          onViewChange={handleViewChange}
          onChatOpen={() => setShowChat(true)}
          onDismissNotification={handleDismissNotification}
          onRetry={() => window.location.reload()}
        />
        {showChat && <AlfredChat onClose={() => setShowChat(false)} />}
      </>
    );
  }

  if (currentView === 'event' && selectedEvent) {
    return (
      <>
        <EventWorkflow
          event={selectedEvent}
          onBack={handleBackToDashboard}
          onTaskUpdate={handleTaskUpdate}
          onChatOpen={() => setShowChat(true)}
        />
        {showChat && <AlfredChat onClose={() => setShowChat(false)} />}
      </>
    );
  }

  if (currentView === 'tracking') {
    return (
      <>
        <TaskTracking
          events={events}
          onBack={handleBackToDashboard}
          onEventSelect={handleEventSelect}
        />
        {showChat && <AlfredChat onClose={() => setShowChat(false)} />}
      </>
    );
  }

  if (currentView === 'approvals') {
    return (
      <>
        <ApprovalPanel
          events={events}
          onBack={handleBackToDashboard}
          onTaskUpdate={handleTaskUpdate}
        />
        {showChat && <AlfredChat onClose={() => setShowChat(false)} />}
      </>
    );
  }

  return null;
}

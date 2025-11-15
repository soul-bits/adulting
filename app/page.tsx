'use client';

import { useState, useEffect } from 'react';
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
    
    // Then fetch every 5 minutes (300000ms) - matches background watcher cadence
    const intervalId = setInterval(() => {
      console.log('[Page] 🔄 Refreshing calendar events (5 min interval)...');
      fetchEvents();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Sequential agent processing: Planning first, then Birthday agent
  useEffect(() => {
    async function processAgentsSequentially() {
      // Only process if events are loaded and not loading
      if (loading || events.length === 0) {
        return;
      }

      console.log('[Page] 🤖 Starting sequential agent processing...');

      // STEP 1: Planning Agent - Generate tasks for birthday events
      console.log('[Page] 📋 Step 1: Planning Agent - Checking for birthday events to plan...');
      
      // Track updated events as we process them
      const updatedEvents = new Map<string, EventType>();
      events.forEach(event => updatedEvents.set(event.id, event));

      for (const event of events) {
        try {
          // CRITICAL: Skip if event already has tasks - do NOT modify existing tasks
          if (event.tasks && event.tasks.length > 0) {
            console.log(`[Page] ⏭️  Planning: Event "${event.title}" already has ${event.tasks.length} task(s), skipping`);
            continue;
          }

          // Quick check: only process events that might be birthdays
          const titleLower = event.title.toLowerCase();
          const mightBeBirthday = titleLower.includes('birthday') || 
                                  titleLower.includes('birth') ||
                                  event.type === 'birthday';

          if (!mightBeBirthday) {
            console.log(`[Page] ⏭️  Planning: Event "${event.title}" doesn't appear to be a birthday, skipping`);
            continue;
          }

          console.log(`[Page] 🎯 Planning: Processing "${event.title}"`);
          
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
            // Update local tracking with new tasks
            const updatedEvent = {
              ...event,
              tasks: [...(event.tasks || []), ...data.tasks]
            };
            updatedEvents.set(event.id, updatedEvent);

            // Update state
            setEvents(prevEvents =>
              prevEvents.map(e => {
                if (e.id === event.id) {
                  // Double-check: don't modify if tasks already exist
                  if (e.tasks && e.tasks.length > 0) {
                    console.log(`[Page] ⚠️  Planning: Event "${event.title}" already has tasks, not modifying`);
                    return e;
                  }
                  return updatedEvent;
                }
                return e;
              })
            );
            console.log(`[Page] ✅ Planning: Generated ${data.tasks.length} task(s) for "${event.title}"`);
          } else if (data.alreadyPlanned) {
            console.log(`[Page] ⏭️  Planning: Event "${event.title}" already planned`);
          } else if (data.skipped) {
            console.log(`[Page] ⏭️  Planning: Event "${event.title}" is ${data.eventType}, not birthday - skipped`);
          } else {
            console.log(`[Page] ⚠️  Planning: No tasks generated for "${event.title}": ${data.message || 'Unknown reason'}`);
          }
        } catch (error) {
          console.error(`[Page] ❌ Planning: Error planning event "${event.title}":`, error);
        }
      }

      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 300));

      // STEP 2: Birthday Agent - Process birthday events with browser-use
      console.log('[Page] 🎂 Step 2: Birthday Agent - Processing birthday events...');

      // Process events using updated events map
      for (const [eventId, event] of updatedEvents.entries()) {
        try {
          // Check if birthday agent already processed this event
          const birthdayTaskExists = event.tasks?.some(task => 
            task.id.startsWith(`task-birthday-dress-${event.id}`)
          );
          
          if (birthdayTaskExists) {
            console.log(`[Page] ⏭️  Birthday Agent: Event "${event.title}" already processed, skipping`);
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

          console.log(`[Page] 🎯 Birthday Agent: Processing "${event.title}"`);
          
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
            setEvents(prevEvents =>
              prevEvents.map(e =>
                e.id === event.id
                  ? { 
                      ...e, 
                      tasks: e.tasks.some(t => t.id === task.id) 
                        ? e.tasks.map(t => t.id === task.id ? { ...t, ...task } : t)
                        : [...e.tasks, task]
                    }
                  : e
              )
            );
            console.log(`[Page] ✅ Birthday Agent: Task created/updated for "${event.title}"`);
          } else if (data.processed === false) {
            console.log(`[Page] ⏭️  Birthday Agent: Event "${event.title}" already processed or not a birthday event`);
          } else {
            console.log(`[Page] ⚠️  Birthday Agent: Failed to process "${event.title}": ${data.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error(`[Page] ❌ Birthday Agent: Error processing "${event.title}":`, error);
          // Continue processing other events even if one fails
        }
      }

      console.log('[Page] ✅ Sequential agent processing complete');
    }

    // Trigger sequential processing after events are loaded
    const timer = setTimeout(() => {
      processAgentsSequentially();
    }, 1000);

    return () => clearTimeout(timer);
  }, [events, loading]);

  const handleEventSelect = (event: EventType) => {
    setSelectedEvent(event);
    setCurrentView('event');
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    setSelectedEvent(null);
  };

  const handleTaskUpdate = (eventId: string, taskId: string, newStatus: Task['status']) => {
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === eventId
          ? {
              ...event,
              tasks: event.tasks.map(task =>
                task.id === taskId ? { ...task, status: newStatus } : task
              )
            }
          : event
      )
    );
  };

  const handleDismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
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

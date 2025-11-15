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
          // Convert date strings to Date objects
          const eventsWithDates = data.events.map((event: any) => ({
            ...event,
            date: new Date(event.date),
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

  // Process birthday events after they're loaded
  useEffect(() => {
    async function processBirthdayEvents() {
      // Only process if events are loaded and not loading
      if (loading || events.length === 0) {
        return;
      }

      console.log('[Page] 🎂 Checking for birthday events to process...');

      for (const event of events) {
        try {
          // Call API route to process birthday event (server-side)
          // The API will check if it's a birthday event and if it's already been processed
          console.log(`[Page] 🎯 Checking event: "${event.title}"`);
          
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
            console.log(`[Page] ✅ Task created/updated for event: "${event.title}"`);
          } else if (data.processed === false) {
            console.log(`[Page] ⏭️  Event "${event.title}" already processed or not a birthday event`);
          } else {
            console.log(`[Page] ⚠️  Failed to process event "${event.title}": ${data.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error(`[Page] ❌ Error processing birthday event "${event.title}":`, error);
          // Continue processing other events even if one fails
        }
      }
    }

    // Process birthday events after a short delay to ensure events are set
    const timer = setTimeout(() => {
      processBirthdayEvents();
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

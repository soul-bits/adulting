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

  // Fetch calendar events on component mount
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);
        
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
    
    fetchEvents();
  }, []);

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

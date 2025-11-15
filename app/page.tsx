'use client';

import { useState } from 'react';
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
 * For now, it uses mock data. Later, this will fetch from APIs.
 */
export default function Home() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [showChat, setShowChat] = useState(false);
  
  // Mock data - will be replaced with API calls later
  const [events, setEvents] = useState<EventType[]>([
    {
      id: '1',
      title: "Niece's Birthday Party",
      date: new Date(2025, 10, 22, 14, 0),
      type: 'birthday',
      location: "Chuck E. Cheese",
      participants: ['Sarah', 'Tom', 'Emma', '+ 7 kids'],
      status: 'in-progress',
      tasks: [
        {
          id: 't1',
          eventId: '1',
          category: 'shopping',
          title: 'Birthday Cake',
          description: 'Order birthday cake for 10 people',
          status: 'suggested',
          needsApproval: true,
          suggestions: [
            {
              id: 's1',
              title: 'Unicorn Theme Cake',
              description: 'Chocolate cake with vanilla frosting',
              price: '$45',
              image: 'https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400'
            },
            {
              id: 's2',
              title: 'Rainbow Layer Cake',
              description: 'Colorful layers with buttercream',
              price: '$52',
              image: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=400'
            }
          ]
        },
        {
          id: 't2',
          eventId: '1',
          category: 'booking',
          title: 'Venue Reservation',
          description: 'Book Chuck E. Cheese for 2 PM',
          status: 'approved',
          needsApproval: false
        },
        {
          id: 't3',
          eventId: '1',
          category: 'shopping',
          title: 'Return Gifts',
          description: 'Small toys and treats for party guests',
          status: 'suggested',
          needsApproval: true,
          suggestions: [
            {
              id: 's3',
              title: 'Party Favor Pack',
              description: '10-pack of mini toys and stickers',
              price: '$28',
              link: 'https://amazon.com'
            }
          ]
        },
        {
          id: 't4',
          eventId: '1',
          category: 'communication',
          title: 'Send Invitations',
          description: 'Email invites to parents with RSVP form',
          status: 'suggested',
          needsApproval: true
        }
      ]
    },
    {
      id: '2',
      title: 'Team Offsite Meeting',
      date: new Date(2025, 10, 25, 10, 0),
      type: 'meeting',
      location: 'The Grand Hotel',
      participants: ['Team of 12'],
      status: 'pending',
      tasks: [
        {
          id: 't5',
          eventId: '2',
          category: 'booking',
          title: 'Conference Room',
          description: 'Book conference room with AV equipment',
          status: 'suggested',
          needsApproval: true
        },
        {
          id: 't6',
          eventId: '2',
          category: 'preparation',
          title: 'Presentation Materials',
          description: 'Prepare slides and handouts',
          status: 'suggested',
          needsApproval: false
        }
      ]
    },
    {
      id: '3',
      title: 'Anniversary Dinner',
      date: new Date(2025, 10, 28, 19, 30),
      type: 'dinner',
      location: 'La Bella Vista',
      participants: ['You', 'Partner'],
      status: 'pending',
      tasks: [
        {
          id: 't7',
          eventId: '3',
          category: 'booking',
          title: 'Restaurant Reservation',
          description: 'Book table for 2 at 7:30 PM',
          status: 'suggested',
          needsApproval: true
        },
        {
          id: 't8',
          eventId: '3',
          category: 'shopping',
          title: 'Gift Selection',
          description: 'Anniversary gift suggestions',
          status: 'suggested',
          needsApproval: true,
          suggestions: [
            {
              id: 's4',
              title: 'Jewelry Set',
              description: 'Elegant necklace and earrings',
              price: '$120',
              image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400'
            }
          ]
        }
      ]
    }
  ]);

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 'n1',
      type: 'question',
      message: 'Should I confirm the Chuck E. Cheese reservation for 2 PM on Nov 22?',
      eventId: '1',
      taskId: 't2',
      options: ['Yes, confirm', 'Change time', 'Cancel']
    },
    {
      id: 'n2',
      type: 'approval',
      message: '3 tasks are ready for your approval',
      options: ['Review now', 'Later']
    }
  ]);

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
          onEventSelect={handleEventSelect}
          onViewChange={handleViewChange}
          onChatOpen={() => setShowChat(true)}
          onDismissNotification={handleDismissNotification}
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

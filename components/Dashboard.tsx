'use client';

import { Calendar as CalendarIcon, Sparkles, CheckCircle2, Clock, AlertCircle, MessageSquare, ListTodo, ClipboardCheck } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { EventType, Notification, ViewType } from '@/lib/types';
import { MiniCalendar } from './MiniCalendar';
import { NotificationCard } from './NotificationCard';

type DashboardProps = {
  events: EventType[];
  notifications: Notification[];
  loading?: boolean;
  error?: string | null;
  onEventSelect: (event: EventType) => void;
  onViewChange: (view: ViewType) => void;
  onChatOpen: () => void;
  onDismissNotification: (id: string) => void;
  onRetry?: () => void;
};

/**
 * Dashboard component - main dashboard view showing events, tasks, and notifications
 */
export function Dashboard({
  events,
  notifications,
  loading = false,
  error = null,
  onEventSelect,
  onViewChange,
  onChatOpen,
  onDismissNotification,
  onRetry
}: DashboardProps) {
  const upcomingEvents = events
    .filter(e => e.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const pendingTasks = events.reduce((acc, event) => {
    const pending = event.tasks.filter(t => t.status === 'suggested' || t.status === 'approved');
    return acc + pending.length;
  }, 0);

  const needsApproval = events.reduce((acc, event) => {
    const approval = event.tasks.filter(t => t.status === 'suggested' && t.needsApproval);
    return acc + approval.length;
  }, 0);

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl mb-2">Adulting</h1>
            <p className="text-gray-600">Your AI-powered life assistant</p>
          </div>
          <Button
            onClick={onChatOpen}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Talk to Alfred
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Calendar & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-l-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Upcoming Events</p>
                  <p className="text-2xl mt-1">{upcomingEvents.length}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-l-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Tasks</p>
                  <p className="text-2xl mt-1">{pendingTasks}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Needs Approval</p>
                  <p className="text-2xl mt-1">{needsApproval}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-purple-500" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-xl mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={onChatOpen}
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-sm">Add Event</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => onViewChange('tracking')}
              >
                <ListTodo className="h-5 w-5" />
                <span className="text-sm">View Tasks</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={() => onViewChange('approvals')}
              >
                <ClipboardCheck className="h-5 w-5" />
                <span className="text-sm">Approvals</span>
                {needsApproval > 0 && (
                  <Badge className="bg-purple-500">{needsApproval}</Badge>
                )}
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2"
                onClick={onChatOpen}
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-sm">Ask Alfred</span>
              </Button>
            </div>
          </Card>

          {/* Upcoming Events */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl">Upcoming Events</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
            
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                <p className="text-sm text-gray-600">Loading calendar events...</p>
              </div>
            )}
            
            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-red-500 text-3xl mb-2">⚠️</div>
                <p className="text-sm text-gray-600 mb-3">{error}</p>
                {onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onRetry}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                )}
              </div>
            )}
            
            {!loading && !error && (
              <div className="space-y-3">
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No upcoming events</p>
                  </div>
                ) : (
                  upcomingEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onEventSelect(event)}
                  className="p-4 rounded-lg border bg-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg">{event.title}</h3>
                        <Badge
                          className={
                            event.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : event.status === 'in-progress'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {event.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {event.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                        {event.location && <span>📍 {event.location}</span>}
                      </div>
                      {event.participants && (
                        <p className="text-sm text-gray-500 mt-1">
                          {event.participants.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {event.tasks.filter(t => t.status === 'completed').length} / {event.tasks.length}
                      </p>
                      <p className="text-xs text-gray-400">tasks done</p>
                    </div>
                  </div>

                  {/* Task Preview */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {event.tasks.slice(0, 3).map(task => (
                      <Badge
                        key={task.id}
                        variant="outline"
                        className={
                          task.status === 'completed'
                            ? 'bg-green-50 border-green-300'
                            : task.status === 'suggested'
                            ? 'bg-purple-50 border-purple-300'
                            : 'bg-blue-50 border-blue-300'
                        }
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : (
                          <Clock className="h-3 w-3 mr-1" />
                        )}
                        {task.title}
                      </Badge>
                    ))}
                    {event.tasks.length > 3 && (
                      <Badge variant="outline" className="bg-gray-50">
                        +{event.tasks.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Calendar & Notifications */}
        <div className="space-y-6">
          {/* Mini Calendar */}
          <Card className="p-6">
            <h2 className="text-xl mb-4">Calendar</h2>
            <MiniCalendar events={events} onEventSelect={onEventSelect} />
          </Card>

          {/* Alfred Suggestions */}
          {upcomingEvents.length > 0 && (
            <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl">Upcoming Events</h2>
              </div>
              <div className="space-y-3">
                {upcomingEvents.slice(0, 3).map((event, index) => (
                  <div key={event.id} className="p-3 bg-white rounded-lg border border-indigo-200">
                    <p className="text-sm mb-2">
                      📅 <strong>{event.title}</strong> - {event.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                      {event.location && ` at ${event.location}`}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEventSelect(event)}
                      className="w-full"
                    >
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Notifications */}
          {notifications.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl mb-4">Notifications</h2>
              <div className="space-y-3">
                {notifications.map(notification => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onDismiss={onDismissNotification}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


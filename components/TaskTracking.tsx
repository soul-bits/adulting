'use client';

import { useState } from 'react';
import { ArrowLeft, Filter, CheckCircle2, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { EventType, Task } from '@/lib/types';
import Image from 'next/image';

type TaskTrackingProps = {
  events: EventType[];
  onBack: () => void;
  onEventSelect: (event: EventType) => void;
};

/**
 * TaskTracking component - displays all tasks across all events with filtering
 */
export function TaskTracking({ events, onBack, onEventSelect }: TaskTrackingProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | Task['status']>('all');

  const allTasks = events.flatMap(event =>
    event.tasks.map(task => ({
      ...task,
      eventTitle: event.title,
      eventDate: event.date,
      event: event
    }))
  );

  const filteredTasks = filterStatus === 'all' 
    ? allTasks 
    : allTasks.filter(task => task.status === filterStatus);

  const sortedTasks = filteredTasks.sort((a, b) => {
    // Prioritize dress ordering tasks (birthday agent tasks)
    const aIsDressTask = a.id.startsWith('task-birthday-dress-');
    const bIsDressTask = b.id.startsWith('task-birthday-dress-');
    
    if (aIsDressTask && !bIsDressTask) return -1;
    if (!aIsDressTask && bIsDressTask) return 1;
    
    // Then sort by status
    const statusOrder = { suggested: 0, approved: 1, executing: 2, completed: 3, issue: 4 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'executing':
        return 'bg-blue-500';
      case 'approved':
        return 'bg-yellow-500';
      case 'suggested':
        return 'bg-purple-500';
      case 'issue':
        return 'bg-red-500';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'executing':
        return <Clock className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-yellow-600" />;
      case 'suggested':
        return <Sparkles className="h-5 w-5 text-purple-600" />;
      case 'issue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
  };

  const statusCounts = {
    all: allTasks.length,
    suggested: allTasks.filter(t => t.status === 'suggested').length,
    approved: allTasks.filter(t => t.status === 'approved').length,
    executing: allTasks.filter(t => t.status === 'executing').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
    issue: allTasks.filter(t => t.status === 'issue').length
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <h1 className="text-3xl mb-4">Task Tracking</h1>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Tasks</p>
              <p className="text-2xl">{statusCounts.all}</p>
            </Card>
            <Card className="p-4 border-l-4 border-l-purple-500">
              <p className="text-sm text-gray-600 mb-1">Suggested</p>
              <p className="text-2xl">{statusCounts.suggested}</p>
            </Card>
            <Card className="p-4 border-l-4 border-l-yellow-500">
              <p className="text-sm text-gray-600 mb-1">Approved</p>
              <p className="text-2xl">{statusCounts.approved}</p>
            </Card>
            <Card className="p-4 border-l-4 border-l-blue-500">
              <p className="text-sm text-gray-600 mb-1">Executing</p>
              <p className="text-2xl">{statusCounts.executing}</p>
            </Card>
            <Card className="p-4 border-l-4 border-l-green-500">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-2xl">{statusCounts.completed}</p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">Filter by status:</span>
              <Button
                size="sm"
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
              >
                All ({statusCounts.all})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'suggested' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('suggested')}
              >
                Suggested ({statusCounts.suggested})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'approved' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('approved')}
              >
                Approved ({statusCounts.approved})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'executing' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('executing')}
              >
                Executing ({statusCounts.executing})
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('completed')}
              >
                Completed ({statusCounts.completed})
              </Button>
            </div>
          </Card>
        </div>

        {/* Timeline View */}
        <div className="space-y-4">
          {sortedTasks.map((task, index) => (
            <Card
              key={task.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onEventSelect(task.event)}
            >
              <div className="flex items-start gap-4">
                {/* Status Indicator */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    {getStatusIcon(task.status)}
                  </div>
                  {index < sortedTasks.length - 1 && (
                    <div className={`w-1 h-16 mt-2 ${getStatusColor(task.status)} opacity-20`} />
                  )}
                </div>

                {/* Task Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg">{task.title}</h3>
                        <Badge
                          className={
                            task.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : task.status === 'executing'
                              ? 'bg-blue-100 text-blue-700'
                              : task.status === 'approved'
                              ? 'bg-yellow-100 text-yellow-700'
                              : task.status === 'suggested'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {task.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{task.description}</p>
                      {task.browserUseUrl && (
                        <div className="mb-2">
                          <a
                            href={task.browserUseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()} // Prevent card click
                          >
                            🔗 View browser automation session
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {task.eventTitle}
                        </span>
                        <span>
                          {task.eventDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className="capitalize px-2 py-1 bg-indigo-50 text-indigo-700 rounded">
                          {task.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Suggestions Preview */}
                  {task.suggestions && task.suggestions.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      {task.suggestions.slice(0, 2).map(suggestion => (
                        <div
                          key={suggestion.id}
                          className="flex-1 p-2 border rounded-lg bg-white"
                        >
                          {suggestion.image && (
                            <Image
                              src={suggestion.image}
                              alt={suggestion.title}
                              width={200}
                              height={80}
                              className="w-full h-20 object-cover rounded mb-1"
                            />
                          )}
                          <p className="text-sm truncate">{suggestion.title}</p>
                          {suggestion.price && (
                            <p className="text-xs text-indigo-600">{suggestion.price}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {sortedTasks.length === 0 && (
            <Card className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No tasks found for this filter</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


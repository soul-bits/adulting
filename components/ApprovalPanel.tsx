'use client';

import { ArrowLeft, CheckCircle2, X, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { EventType, Task } from '@/lib/types';
import Image from 'next/image';

type ApprovalPanelProps = {
  events: EventType[];
  onBack: () => void;
  onTaskUpdate: (eventId: string, taskId: string, status: Task['status']) => void;
};

/**
 * ApprovalPanel component - displays all tasks that need approval
 */
export function ApprovalPanel({ events, onBack, onTaskUpdate }: ApprovalPanelProps) {
  const pendingApprovals = events.flatMap(event =>
    event.tasks
      .filter(task => task.status === 'suggested' && task.needsApproval)
      .map(task => ({
        ...task,
        eventTitle: event.title,
        eventDate: event.date,
        eventId: event.id
      }))
  );

  const handleApproveAll = () => {
    pendingApprovals.forEach(task => {
      onTaskUpdate(task.eventId, task.id, 'approved');
    });
  };

  const handleRejectAll = () => {
    pendingApprovals.forEach(task => {
      onTaskUpdate(task.eventId, task.id, 'issue');
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl mb-2">Approval Panel</h1>
              <p className="text-gray-600">
                {pendingApprovals.length} {pendingApprovals.length === 1 ? 'task' : 'tasks'} waiting for your approval
              </p>
            </div>
            {pendingApprovals.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleRejectAll}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject All
                </Button>
                <Button
                  onClick={handleApproveAll}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve All
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Approval Cards */}
        {pendingApprovals.length > 0 ? (
          <div className="space-y-4">
            {pendingApprovals.map(task => (
              <Card key={task.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-purple-50 border-purple-300">
                        {task.eventTitle}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {task.eventDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <h2 className="text-xl mb-1">{task.title}</h2>
                    <p className="text-gray-600">{task.description}</p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700">
                    Needs Approval
                  </Badge>
                </div>

                {/* Suggestions */}
                {task.suggestions && task.suggestions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm mb-3">Alfred's Suggestions:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {task.suggestions.map(suggestion => (
                        <div
                          key={suggestion.id}
                          className="border rounded-lg p-4 bg-gradient-to-br from-indigo-50 to-purple-50"
                        >
                          {suggestion.image && (
                            <Image
                              src={suggestion.image}
                              alt={suggestion.title}
                              width={400}
                              height={160}
                              className="w-full h-40 object-cover rounded-lg mb-3"
                            />
                          )}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="mb-1">{suggestion.title}</h3>
                              <p className="text-sm text-gray-600">{suggestion.description}</p>
                            </div>
                            {suggestion.price && (
                              <span className="text-lg text-indigo-600 ml-2">{suggestion.price}</span>
                            )}
                          </div>
                          {suggestion.link && (
                            <Button size="sm" variant="outline" className="w-full">
                              View on Website
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => onTaskUpdate(task.eventId, task.id, 'issue')}
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                  >
                    Modify
                  </Button>
                  <Button
                    onClick={() => onTaskUpdate(task.eventId, task.id, 'approved')}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl mb-2">All Caught Up!</h2>
            <p className="text-gray-600 mb-6">
              You have no pending approvals at the moment. Alfred will notify you when new tasks need your attention.
            </p>
            <Button onClick={onBack}>
              Back to Dashboard
            </Button>
          </Card>
        )}

        {/* Alfred's Note */}
        {pendingApprovals.length > 0 && (
          <Card className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <div className="flex items-start gap-3">
              <Sparkles className="h-6 w-6 text-indigo-600 flex-shrink-0" />
              <div>
                <h3 className="mb-2">Alfred's Note</h3>
                <p className="text-sm text-gray-700">
                  I've carefully selected these options based on your preferences, budget, and event requirements. 
                  Feel free to approve, modify, or reject any suggestion. I'm here to make your life easier!
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, X, Sparkles, Loader2, Search } from 'lucide-react';
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
  const [loadingRecommendations, setLoadingRecommendations] = useState<Record<string, boolean>>({});
  const [taskSuggestions, setTaskSuggestions] = useState<Record<string, Task['suggestions']>>({});
  const [taskBrowserUseUrls, setTaskBrowserUseUrls] = useState<Record<string, string>>({});
  const autoFetchInitiatedRef = useRef<Set<string>>(new Set());
  
  const pendingApprovals = events.flatMap(event =>
    event.tasks
      .filter(task => task.status === 'suggested' && task.needsApproval)
      .map(task => ({
        ...task,
        eventTitle: event.title,
        eventDate: event.date,
        eventId: event.id,
        // Use stored suggestions if available, otherwise use task suggestions
        suggestions: taskSuggestions[task.id] || task.suggestions || [],
        // Use stored browser-use URL if available
        browserUseUrl: taskBrowserUseUrls[task.id] || task.browserUseUrl
      }))
  );

  const handleGetRecommendations = async (task: Task & { eventId: string }) => {
    // Prevent duplicate calls
    if (loadingRecommendations[task.id]) {
      console.log(`[ApprovalPanel] ⚠️  Already fetching recommendations for task ${task.id}`);
      return;
    }

    setLoadingRecommendations(prev => ({ ...prev, [task.id]: true }));
    
    try {
      // Check if this is a dress order task - use browser-use only for this
      const taskTitle = task.title.toLowerCase();
      const useBrowserUse = taskTitle.includes('order dress');
      
      const endpoint = useBrowserUse ? '/api/tasks/recommendations' : '/api/tasks/recommendations-openai';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task }),
      });

      const data = await response.json();

      if (data.success) {
        // Update browser-use URL immediately if available (even before suggestions are ready)
        if (data.browserUseUrl) {
          setTaskBrowserUseUrls(prev => ({
            ...prev,
            [task.id]: data.browserUseUrl,
          }));
          console.log(`[ApprovalPanel] ✅ Got browser-use URL for task ${task.id}: ${data.browserUseUrl}`);
        }

        // Update suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          setTaskSuggestions(prev => ({
            ...prev,
            [task.id]: data.suggestions,
          }));
          console.log(`[ApprovalPanel] ✅ Got ${data.suggestions.length} recommendation(s) for task ${task.id}`);
        } else if (useBrowserUse) {
          console.log(`[ApprovalPanel] ⏳ Browser-use session started, recommendations will be available soon`);
        }
      } else {
        console.error('[ApprovalPanel] Failed to get recommendations:', data.message);
        // Don't show blocking dialog - just log the error
        if (data.error === 'Task is already being processed') {
          console.log('[ApprovalPanel] Task already being processed, reusing existing session...');
        }
      }
    } catch (error) {
      console.error('[ApprovalPanel] Error getting recommendations:', error);
    } finally {
      setLoadingRecommendations(prev => ({ ...prev, [task.id]: false }));
    }
  };

  // Automatically fetch recommendations for dress order tasks ONLY ONCE
  useEffect(() => {
    const shouldAutoFetch = (task: any) => {
      const taskTitle = task.title.toLowerCase();
      // Only auto-fetch for dress order tasks (using browser-use)
      return taskTitle.includes('order dress');
    };

    // Find FIRST dress order task that hasn't been initiated yet
    const dressOrderTask = pendingApprovals.find(
      task => !autoFetchInitiatedRef.current.has(task.id) && 
              !loadingRecommendations[task.id] && 
              shouldAutoFetch(task)
    );
    
    if (dressOrderTask) {
      // Mark as initiated IMMEDIATELY to prevent duplicate calls
      autoFetchInitiatedRef.current.add(dressOrderTask.id);
      
      console.log(`[ApprovalPanel] 🤖 Auto-fetching browser-use for dress order task: ${dressOrderTask.title}`);
      handleGetRecommendations(dressOrderTask);
    }
  }, [pendingApprovals]);

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
                    
                    {/* Browser-Use Link Section */}
                    {(task.browserUseUrl || (task as any).tempBrowserUseUrl) && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white gap-2"
                          onClick={() => window.open(task.browserUseUrl || (task as any).tempBrowserUseUrl, '_blank', 'noopener,noreferrer')}
                        >
                          <span className="text-lg">🔗</span>
                          Watch Live Automation
                        </Button>
                      </div>
                    )}
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

                {/* Recommendations Section */}
                {task.suggestions && task.suggestions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-3">Recommendations:</p>
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
                              <h3 className="mb-1 font-medium">{suggestion.title}</h3>
                              <p className="text-sm text-gray-600">{suggestion.description}</p>
                            </div>
                            {suggestion.price && (
                              <span className="text-lg text-indigo-600 ml-2">{suggestion.price}</span>
                            )}
                          </div>
                          {suggestion.link && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full"
                              onClick={() => window.open(suggestion.link, '_blank', 'noopener,noreferrer')}
                            >
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
                    onClick={() => handleGetRecommendations(task)}
                    disabled={loadingRecommendations[task.id]}
                    className="flex-1"
                  >
                    {loadingRecommendations[task.id] ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Get Recommendations
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      // If this is a dress ordering task with browser-use URL, open it
                      if (task.id.startsWith('task-birthday-dress-') && task.browserUseUrl) {
                        window.open(task.browserUseUrl, '_blank', 'noopener,noreferrer');
                      }
                      // Update task status to approved
                      onTaskUpdate(task.eventId, task.id, 'approved');
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {task.id.startsWith('task-birthday-dress-') && task.browserUseUrl ? 'Approve & View Session' : 'Approve'}
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


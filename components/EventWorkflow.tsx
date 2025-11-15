'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Users, Calendar, Sparkles, ShoppingCart, Mail, Package, CheckCircle2, Clock, AlertCircle, Loader2, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { EventType, Task } from '@/lib/types';
import Image from 'next/image';

type EventWorkflowProps = {
  event: EventType;
  onBack: () => void;
  onTaskUpdate: (eventId: string, taskId: string, status: Task['status']) => void;
  onChatOpen: () => void;
};

/**
 * EventWorkflow component - displays detailed view of an event with all tasks
 */
export function EventWorkflow({ event, onBack, onTaskUpdate, onChatOpen }: EventWorkflowProps) {
  const [loadingRecommendations, setLoadingRecommendations] = useState<Record<string, boolean>>({});
  const [taskSuggestions, setTaskSuggestions] = useState<Record<string, Task['suggestions']>>({});
  const [taskBrowserUseUrls, setTaskBrowserUseUrls] = useState<Record<string, string>>({});
  const [autoFetchedTasks, setAutoFetchedTasks] = useState<Set<string>>(new Set());

  const handleGetRecommendations = async (task: Task) => {
    // Prevent duplicate calls
    if (loadingRecommendations[task.id]) {
      console.log(`[EventWorkflow] ⚠️  Already fetching recommendations for task ${task.id}`);
      return;
    }

    setLoadingRecommendations(prev => ({ ...prev, [task.id]: true }));
    
    try {
      const response = await fetch('/api/tasks/recommendations', {
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
          console.log(`[EventWorkflow] ✅ Got browser-use URL for task ${task.id}: ${data.browserUseUrl}`);
        }

        // Update suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          setTaskSuggestions(prev => ({
            ...prev,
            [task.id]: data.suggestions,
          }));
          console.log(`[EventWorkflow] ✅ Got ${data.suggestions.length} recommendation(s) for task ${task.id}`);
        } else {
          console.log(`[EventWorkflow] ⏳ Browser-use session started, recommendations will be available soon`);
        }
      } else {
        console.error('[EventWorkflow] Failed to get recommendations:', data.message);
        // Don't show blocking dialog - just log the error
        if (data.error === 'Task is already being processed') {
          console.log('[EventWorkflow] Task already being processed, reusing existing session...');
        }
      }
    } catch (error) {
      console.error('[EventWorkflow] Error getting recommendations:', error);
    } finally {
      setLoadingRecommendations(prev => ({ ...prev, [task.id]: false }));
    }
  };

  // Automatically fetch recommendations for all suggested tasks
  useEffect(() => {
    const suggestedTasks = event.tasks.filter(task => task.status === 'suggested' && !autoFetchedTasks.has(task.id));
    
    if (suggestedTasks.length > 0) {
      console.log(`[EventWorkflow] 🤖 Auto-fetching recommendations for ${suggestedTasks.length} suggested task(s)`);
      
      // Fetch recommendations for each suggested task
      suggestedTasks.forEach(task => {
        if (!loadingRecommendations[task.id]) {
          console.log(`[EventWorkflow] Auto-fetching recommendations for task: ${task.id}`);
          handleGetRecommendations(task);
          setAutoFetchedTasks(prev => new Set([...prev, task.id]));
        }
      });
    }
  }, [event.tasks, autoFetchedTasks, loadingRecommendations, handleGetRecommendations]);

  const getCategoryIcon = (category: Task['category']) => {
    switch (category) {
      case 'shopping':
        return <ShoppingCart className="h-5 w-5" />;
      case 'booking':
        return <Calendar className="h-5 w-5" />;
      case 'communication':
        return <Mail className="h-5 w-5" />;
      case 'preparation':
        return <Package className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'executing':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'approved':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'suggested':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'issue':
        return 'bg-red-100 text-red-700 border-red-300';
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'executing':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'suggested':
        return <Sparkles className="h-4 w-4" />;
      case 'issue':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const groupedTasks = event.tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl">{event.title}</h1>
                <Badge
                  className={
                    event.type === 'birthday'
                      ? 'bg-pink-100 text-pink-700'
                      : event.type === 'meeting'
                      ? 'bg-blue-100 text-blue-700'
                      : event.type === 'conference'
                      ? 'bg-purple-100 text-purple-700'
                      : event.type === 'dinner'
                      ? 'bg-orange-100 text-orange-700'
                      : event.type === 'travel'
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-gray-100 text-gray-700'
                  }
                >
                  {event.type}
                </Badge>
                {event.planningStatus === 'planning' && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Planning in progress...
                  </Badge>
                )}
                {event.planningStatus === 'completed' && event.tasks.length === 0 && (
                  <Badge className="bg-green-100 text-green-700 border-green-300">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Planning complete
                  </Badge>
                )}
                {event.planningStatus === 'error' && (
                  <Badge className="bg-red-100 text-red-700 border-red-300">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Planning failed
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {event.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </span>
                )}
                {event.participants && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {event.participants.length} participants
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
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
            <Button
              onClick={onChatOpen}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Ask Alfred
            </Button>
          </div>
        </div>
        </div>

        {/* Planning Status */}
        {event.planningStatus === 'planning' && (
          <Card className="p-6 mb-6 border-blue-200 bg-blue-50">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              <div>
                <h3 className="font-medium text-blue-900">Planning in Progress</h3>
                <p className="text-sm text-blue-700">AI is analyzing this event and generating tasks...</p>
              </div>
            </div>
          </Card>
        )}

        {/* Progress Bar */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Overall Progress</span>
            <span className="text-sm">
              {event.tasks.filter(t => t.status === 'completed').length} / {event.tasks.length} tasks completed
            </span>
          </div>
          {event.tasks.length > 0 ? (
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
              style={{
                  width: `${Math.min((event.tasks.filter(t => t.status === 'completed').length / event.tasks.length) * 100, 100)}%`
              }}
            />
          </div>
          ) : (
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-gray-300 h-3 rounded-full" style={{ width: '0%' }} />
            </div>
          )}
        </Card>

        {/* Task Categories */}
        {Object.keys(groupedTasks).length === 0 ? (
          <Card className="p-12 text-center">
            {event.planningStatus === 'planning' ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                <h3 className="text-lg font-medium text-gray-900">Planning in Progress</h3>
                <p className="text-sm text-gray-600">Tasks will appear here once planning is complete.</p>
              </div>
            ) : event.planningStatus === 'error' ? (
              <div className="flex flex-col items-center gap-3">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h3 className="text-lg font-medium text-gray-900">Planning Failed</h3>
                <p className="text-sm text-gray-600">Unable to generate tasks for this event.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Package className="h-12 w-12 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900">No Tasks Yet</h3>
                <p className="text-sm text-gray-600">Tasks will be generated automatically for birthday events.</p>
              </div>
            )}
          </Card>
        ) : (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([category, tasks]) => (
            <Card key={category} className="p-6">
              <div className="flex items-center gap-2 mb-4">
                {getCategoryIcon(category as Task['category'])}
                <h2 className="text-xl capitalize">{category}</h2>
                <Badge variant="outline">
                  {tasks.filter(t => t.status === 'completed').length}/{tasks.length}
                </Badge>
              </div>

              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg">{task.title}</h3>
                          <Badge className={getStatusColor(task.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(task.status)}
                              {task.status}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{task.description}</p>
                        
                        {/* Browser-Use Link Section */}
                        <div className="mt-3">
                          {(taskBrowserUseUrls[task.id] || task.browserUseUrl) ? (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white gap-2"
                                onClick={() => window.open(taskBrowserUseUrls[task.id] || task.browserUseUrl, '_blank', 'noopener,noreferrer')}
                              >
                                <span className="text-lg">🔗</span>
                                {task.status === 'executing' || loadingRecommendations[task.id] 
                                  ? 'Watch Live Automation' 
                                  : 'View Automation Session'}
                              </Button>
                              <span className="text-xs text-gray-500 italic">(opens in new tab)</span>
                            </div>
                          ) : loadingRecommendations[task.id] ? (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                              <span className="text-sm text-blue-600">
                                ⏳ Starting browser automation session...
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Recommendations */}
                    {(taskSuggestions[task.id] || task.suggestions) && (taskSuggestions[task.id] || task.suggestions)!.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-3">Recommendations:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(taskSuggestions[task.id] || task.suggestions)!.map(suggestion => (
                            <div
                              key={suggestion.id}
                              className="border rounded-lg p-3 hover:border-indigo-300 hover:shadow-md transition-all"
                            >
                              {suggestion.image && (
                                <Image
                                  src={suggestion.image}
                                  alt={suggestion.title}
                                  width={400}
                                  height={128}
                                  className="w-full h-32 object-cover rounded-lg mb-2"
                                />
                              )}
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="mb-1 font-medium">{suggestion.title}</h4>
                                  <p className="text-sm text-gray-600">{suggestion.description}</p>
                                </div>
                                {suggestion.price && (
                                  <span className="text-indigo-600 ml-2">{suggestion.price}</span>
                                )}
                              </div>
                              {suggestion.link && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full mt-2"
                                  onClick={() => window.open(suggestion.link, '_blank', 'noopener,noreferrer')}
                                >
                                  View Details
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      {task.status === 'suggested' && (
                        <>
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
                            onClick={() => onTaskUpdate(event.id, task.id, 'approved')}
                            className="flex-1"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                        </>
                      )}
                      {task.status === 'approved' && (
                        <Button
                          onClick={() => onTaskUpdate(event.id, task.id, 'executing')}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Execute Now
                        </Button>
                      )}
                      {task.status === 'executing' && (
                        <div className="flex-1 flex flex-col gap-2">
                          <Button disabled className="w-full">
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            In Progress...
                          </Button>
                          {task.browserUseUrl || taskBrowserUseUrls[task.id] ? (
                            <Button
                              size="sm"
                              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                              onClick={() => window.open(task.browserUseUrl || taskBrowserUseUrls[task.id], '_blank', 'noopener,noreferrer')}
                            >
                              <span className="text-lg mr-1">🔗</span>
                              Watch Live Automation
                            </Button>
                          ) : (
                            <div className="flex items-center justify-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Waiting for browser-use session...
                            </div>
                          )}
                        </div>
                      )}
                      {task.status === 'completed' && (
                        <div className="flex-1 flex flex-col gap-2">
                          <Button disabled className="w-full bg-green-600">
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Completed
                          </Button>
                          {(task.browserUseUrl || taskBrowserUseUrls[task.id]) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-blue-300 text-blue-600 hover:bg-blue-50"
                              onClick={() => window.open(task.browserUseUrl || taskBrowserUseUrls[task.id], '_blank', 'noopener,noreferrer')}
                            >
                              <span className="mr-1">🔗</span>
                              View Automation Session
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        )}

        {/* Alfred's Recommendations */}
        <Card className="mt-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl">Additional Recommendations</h2>
          </div>
          <div className="space-y-3">
            <div className="p-4 bg-white rounded-lg border">
              <p className="mb-2">📸 Consider hiring a photographer to capture memories</p>
              <Button size="sm" variant="outline">
                View Options
              </Button>
            </div>
            <div className="p-4 bg-white rounded-lg border">
              <p className="mb-2">🎈 Add decorations matching the theme</p>
              <Button size="sm" variant="outline">
                Browse Decorations
              </Button>
            </div>
            <div className="p-4 bg-white rounded-lg border">
              <p className="mb-2">🎮 Entertainment ideas for kids aged 5-10</p>
              <Button size="sm" variant="outline">
                See Suggestions
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}


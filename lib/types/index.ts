/**
 * Type definitions for the Adulting app
 * 
 * These types define the data structures used throughout the application
 * for events, tasks, suggestions, and notifications.
 */

/**
 * Represents different types of events that can be managed
 */
export type EventType = {
  id: string;
  title: string;
  date: Date;
  type: 'birthday' | 'meeting' | 'conference' | 'dinner' | 'travel' | 'other';
  location?: string;
  participants?: string[];
  status: 'pending' | 'in-progress' | 'completed';
  tasks: Task[];
};

/**
 * Represents a task associated with an event
 */
export type Task = {
  id: string;
  eventId: string;
  category: 'shopping' | 'booking' | 'communication' | 'preparation';
  title: string;
  description: string;
  status: 'suggested' | 'approved' | 'executing' | 'completed' | 'issue';
  suggestions?: Suggestion[];
  needsApproval: boolean;
};

/**
 * Represents a suggestion for a task (e.g., product recommendations)
 */
export type Suggestion = {
  id: string;
  title: string;
  description: string;
  link?: string;
  image?: string;
  price?: string;
};

/**
 * Represents a notification shown to the user
 */
export type Notification = {
  id: string;
  type: 'question' | 'alert' | 'approval';
  message: string;
  eventId?: string;
  taskId?: string;
  options?: string[];
};

/**
 * View types for navigation
 */
export type ViewType = 'dashboard' | 'event' | 'tracking' | 'approvals';


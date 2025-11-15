/**
 * Type definitions for the Adulting application
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

export type Suggestion = {
  id: string;
  title: string;
  description: string;
  link?: string;
  image?: string;
  price?: string;
};

export type Notification = {
  id: string;
  type: 'question' | 'alert' | 'approval';
  message: string;
  eventId?: string;
  taskId?: string;
  options?: string[];
};

export type ViewType = 'dashboard' | 'event' | 'tracking' | 'approvals';


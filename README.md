# Adulting - AI Life Assistant

An AI-powered life assistant application that helps you manage events, tasks, and daily activities. Built with React, TypeScript, and modern UI components.

## Overview

Adulting is a comprehensive life management tool that uses AI (Alfred) to help you plan and organize events, track tasks, and handle approvals. The application provides an intuitive interface for managing everything from birthday parties to business meetings, with intelligent task suggestions and automated workflows.

## Features

### 🎯 Dashboard
- **Overview Statistics**: View upcoming events, pending tasks, and items needing approval at a glance
- **Mini Calendar**: Interactive calendar showing all your events
- **Quick Actions**: Fast access to common tasks (Add Event, View Tasks, Approvals, Ask Alfred)
- **Upcoming Events**: List of upcoming events with task progress indicators
- **Alfred's Suggestions**: AI-powered recommendations for your events
- **Notifications**: Real-time notifications for questions, alerts, and approvals

### 📅 Event Management
- **Event Types**: Support for birthdays, meetings, conferences, dinners, travel, and more
- **Event Details**: Track location, participants, dates, and status
- **Event Workflow**: Detailed view for each event with categorized tasks
- **Progress Tracking**: Visual progress bars showing task completion status

### ✅ Task Tracking
- **Task Categories**: 
  - Shopping (gifts, supplies, etc.)
  - Booking (venues, restaurants, etc.)
  - Communication (invitations, RSVPs, etc.)
  - Preparation (materials, presentations, etc.)
- **Task Statuses**: 
  - Suggested (AI recommendations)
  - Approved (ready to execute)
  - Executing (in progress)
  - Completed (finished)
  - Issue (needs attention)
- **Task Filtering**: Filter tasks by status across all events
- **Timeline View**: Visual timeline of all tasks with status indicators

### 🤖 Alfred AI Assistant
- **Chat Interface**: Interactive chat with Alfred, your AI life assistant
- **Event Planning**: Get help planning birthdays, meetings, dinners, and more
- **Gift Suggestions**: Receive personalized gift recommendations
- **Quick Prompts**: Pre-built prompts for common tasks
- **Voice Input**: Support for voice commands (UI ready)

### ✋ Approval Panel
- **Centralized Approvals**: Review all tasks requiring approval in one place
- **Bulk Actions**: Approve or reject multiple tasks at once
- **Detailed Suggestions**: View AI-suggested options with images, prices, and links
- **Modify Tasks**: Adjust task details before approval

### 💡 Smart Suggestions
- **Product Recommendations**: AI-curated suggestions with images and pricing
- **Venue Options**: Restaurant and venue recommendations
- **Gift Ideas**: Personalized gift suggestions based on context
- **Additional Recommendations**: Proactive suggestions for enhancing events

## Tech Stack

- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 6.3.5
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Calendar**: React Day Picker
- **Notifications**: Sonner

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd adulting
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000` (or the port shown in your terminal)

### Building for Production

```bash
npm run build
```

The production build will be created in the `dist` directory.

## Project Structure

```
adulting/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx          # Main dashboard view
│   │   ├── EventWorkflow.tsx      # Event detail and task management
│   │   ├── TaskTracking.tsx       # Task tracking and filtering
│   │   ├── ApprovalPanel.tsx      # Task approval interface
│   │   ├── AlfredChat.tsx         # AI assistant chat
│   │   ├── MiniCalendar.tsx       # Calendar component
│   │   ├── NotificationCard.tsx   # Notification display
│   │   └── ui/                    # Reusable UI components (shadcn/ui)
│   ├── App.tsx                    # Main application component
│   ├── main.tsx                   # Application entry point
│   ├── index.css                  # Global styles
│   └── styles/
│       └── globals.css            # Additional global styles
├── index.html                     # HTML template
├── package.json                   # Dependencies and scripts
└── vite.config.ts                # Vite configuration
```

## Design

This project is based on a Figma design. The original design file is available at:
https://www.figma.com/design/w3VfDfUYbJ0ngMUtAxOz9Q/AI-Life-Assistant

## Attributions

- UI components from [shadcn/ui](https://ui.shadcn.com/) (MIT License)
- Photos from [Unsplash](https://unsplash.com) (Unsplash License)

## License

This project is private and not licensed for public use.

## Future Enhancements

Potential features for future development:
- Backend integration for persistent data storage
- Real AI integration (currently uses mock responses)
- Calendar sync with Google Calendar, iCal, etc.
- Email integration for sending invitations
- Payment processing for bookings and purchases
- Mobile app version
- Multi-user support and sharing

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { EventType } from '../App';

type MiniCalendarProps = {
  events: EventType[];
  onEventSelect: (event: EventType) => void;
};

export function MiniCalendar({ events, onEventSelect }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDay = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === month &&
        eventDate.getFullYear() === year
      );
    });
  };

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="aspect-square" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEvents = getEventsForDay(day);
    const isToday =
      day === new Date().getDate() &&
      month === new Date().getMonth() &&
      year === new Date().getFullYear();

    days.push(
      <button
        key={day}
        onClick={() => {
          if (dayEvents.length > 0) {
            onEventSelect(dayEvents[0]);
          }
        }}
        className={`
          aspect-square p-1 rounded-lg text-sm relative
          ${isToday ? 'bg-indigo-100 border-2 border-indigo-500' : ''}
          ${dayEvents.length > 0 ? 'hover:bg-purple-50 cursor-pointer' : ''}
          ${dayEvents.length === 0 && !isToday ? 'hover:bg-gray-50' : ''}
        `}
      >
        <span className={isToday ? 'font-bold' : ''}>{day}</span>
        {dayEvents.length > 0 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                className="w-1 h-1 rounded-full bg-indigo-600"
              />
            ))}
          </div>
        )}
      </button>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={previousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-xs text-gray-600 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">{days}</div>
    </div>
  );
}

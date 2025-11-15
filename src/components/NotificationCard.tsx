import { AlertCircle, HelpCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from './ui/button';
import { Notification } from '../App';

type NotificationCardProps = {
  notification: Notification;
  onDismiss: (id: string) => void;
};

export function NotificationCard({ notification, onDismiss }: NotificationCardProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'question':
        return <HelpCircle className="h-5 w-5 text-blue-600" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'approval':
        return <CheckCircle2 className="h-5 w-5 text-purple-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'question':
        return 'bg-blue-50 border-blue-200';
      case 'alert':
        return 'bg-yellow-50 border-yellow-200';
      case 'approval':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getBgColor()} relative`}>
      <button
        onClick={() => onDismiss(notification.id)}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 pr-4">
          <p className="text-sm mb-2">{notification.message}</p>
          {notification.options && notification.options.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {notification.options.map((option, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={idx === 0 ? 'default' : 'outline'}
                  onClick={() => onDismiss(notification.id)}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

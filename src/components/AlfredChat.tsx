import { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

type AlfredChatProps = {
  onClose: () => void;
};

type Message = {
  id: string;
  sender: 'user' | 'alfred';
  text: string;
  timestamp: Date;
};

export function AlfredChat({ onClose }: AlfredChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'alfred',
      text: "Hello! I'm Alfred, your AI life assistant. How can I help you today? You can tell me about upcoming events, ask me to book something, or simply let me know what's on your mind.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate Alfred's response
    setTimeout(() => {
      const alfredResponse = getAlfredResponse(inputValue);
      const alfredMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'alfred',
        text: alfredResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, alfredMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const getAlfredResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();

    if (input.includes('birthday') || input.includes('party')) {
      return "Great! I'd be happy to help plan a birthday party. Could you tell me:\n\n1. When is the party?\n2. How many guests?\n3. What's the age group?\n4. Any specific theme or preferences?\n\nI'll start preparing gift ideas, venue suggestions, and everything else you'll need!";
    } else if (input.includes('meeting') || input.includes('conference')) {
      return "I can help you prepare for your meeting! Let me know:\n\n1. Date and time\n2. Number of attendees\n3. Location preference\n4. Any materials you need prepared\n\nI'll take care of booking, prep work, and reminders.";
    } else if (input.includes('dinner') || input.includes('restaurant')) {
      return "Planning a dinner out? Perfect! Tell me:\n\n1. Date and time\n2. Number of people\n3. Cuisine preference\n4. Budget range\n\nI'll find the best restaurants and make reservations for you.";
    } else if (input.includes('gift') || input.includes('present')) {
      return "I love helping with gift selection! Share some details:\n\n1. Who is it for?\n2. What's the occasion?\n3. Budget range\n4. Their interests or hobbies\n\nI'll curate personalized options for you to choose from.";
    } else {
      return "I'm here to help! I can assist with:\n\n• Planning events (birthdays, meetings, dinners)\n• Booking venues and restaurants\n• Shopping for gifts and party supplies\n• Sending invitations and managing RSVPs\n• Preparing for conferences and trips\n\nWhat would you like me to help with?";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Plan my niece's birthday party",
    "Book a restaurant for anniversary",
    "Help me prepare for team meeting",
    "Find a gift for my partner"
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg">Alfred</h2>
              <p className="text-xs opacity-90">Your AI Life Assistant</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-line text-sm">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-600 mb-2">Quick prompts:</p>
            <div className="flex gap-2 flex-wrap">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(prompt)}
                  className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              title="Voice input"
            >
              <Mic className="h-4 w-4" />
            </Button>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message or use voice..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

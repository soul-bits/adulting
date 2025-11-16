'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, Sparkles, Check, Clock, MapPin, Star, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
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

type ExtractedDateTime = {
  date?: string | null;
  time?: string | null;
  datetime?: string | null;
  hasDate: boolean;
  hasTime: boolean;
};

type TimeProposal = {
  startTime: string;
  endTime: string;
  duration?: string;
  label?: string;
};

type VenueProposal = {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: string;
  features?: string;
};

type Preferences = {
  partyTheme?: string;
  budget?: string;
  numberOfGuests?: string;
  ageGroup?: string;
  specialRequirements?: string;
  other?: string;
};

type Proposals = {
  timeProposals?: TimeProposal[];
  venueProposals?: VenueProposal[];
  preferences?: Preferences;
  hasTimeProposals: boolean;
  hasVenueProposals: boolean;
  hasPreferences: boolean;
};

/**
 * AlfredChat component - AI chat interface for interacting with Alfred
 */
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
  const [extractedDateTime, setExtractedDateTime] = useState<ExtractedDateTime | null>(null);
  const [proposals, setProposals] = useState<Proposals | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number | null>(null);
  const [selectedVenueIndex, setSelectedVenueIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
          setIsRecording(false);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please enable microphone permissions in your browser settings.');
          }
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleSend = async () => {
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

    try {
      // Call the OpenAI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            sender: msg.sender,
            text: msg.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      console.log('data', data);
      const alfredMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'alfred',
        text: data.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, alfredMessage]);
      
      // Update extracted date/time if found
      if (data.extractedDateTime && (data.extractedDateTime.hasDate || data.extractedDateTime.hasTime)) {
        setExtractedDateTime(data.extractedDateTime);
      }
      
      // Update proposals if found
      if (data.proposals) {
        setProposals(data.proposals);
        // Reset selections when new proposals arrive
        setSelectedTimeIndex(null);
        setSelectedVenueIndex(null);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Fallback response on error
      const alfredMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'alfred',
        text: "I'm sorry, I'm having trouble connecting right now. Please make sure your OPENAI_API_KEY is set in your .env.local file. You can still use me for basic help!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, alfredMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Plan my niece's 5th birthday party next Saturday for 3 adults and 7 kids",
    "Book a restaurant for anniversary",
    "Help me prepare for team meeting",
    "Find a gift for my partner"
  ];

  const handleApproveTime = async (startTime: string, endTime: string) => {
    const formatTime = (time24: string) => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };
    
    const approvalText = `I approve the time: ${formatTime(startTime)} - ${formatTime(endTime)}`;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: approvalText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            sender: msg.sender,
            text: msg.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      const alfredMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'alfred',
        text: data.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, alfredMessage]);
      
      if (data.extractedDateTime && (data.extractedDateTime.hasDate || data.extractedDateTime.hasTime)) {
        setExtractedDateTime(data.extractedDateTime);
      }
      
      if (data.proposals) {
        setProposals(data.proposals);
        // Reset selections when new proposals arrive
        setSelectedTimeIndex(null);
        setSelectedVenueIndex(null);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleApproveVenue = async (venueName: string) => {
    const approvalText = `I approve the venue: ${venueName}`;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: approvalText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            sender: msg.sender,
            text: msg.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      const alfredMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'alfred',
        text: data.message,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, alfredMessage]);
      
      if (data.extractedDateTime && (data.extractedDateTime.hasDate || data.extractedDateTime.hasTime)) {
        setExtractedDateTime(data.extractedDateTime);
      }
      
      if (data.proposals) {
        setProposals(data.proposals);
        // Reset selections when new proposals arrive
        setSelectedTimeIndex(null);
        setSelectedVenueIndex(null);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleApproveSelection = async () => {
    if (!proposals || !extractedDateTime?.date) {
      console.error('Missing proposals or date');
      return;
    }
    
    const formatTime = (time24: string) => {
      if (!time24) return '';
      const [hours, minutes] = time24.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    };

    // Get selected time and venue
    const selectedTime = selectedTimeIndex !== null && proposals.timeProposals && proposals.timeProposals[selectedTimeIndex]
      ? proposals.timeProposals[selectedTimeIndex]
      : null;
    const selectedVenue = selectedVenueIndex !== null && proposals.venueProposals && proposals.venueProposals[selectedVenueIndex]
      ? proposals.venueProposals[selectedVenueIndex]
      : null;

    if (!selectedTime) {
      console.error('No time selected');
      return;
    }

    setIsTyping(true);

    try {
      // Step 1: Generate event title and description using LLM
      let eventTitle = '';
      let eventDescription = '';
      
      try {
        const generateResponse = await fetch('/api/events/generate-details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatContext: messages.map(msg => ({
              sender: msg.sender,
              text: msg.text,
            })),
            selectedTime: selectedTime ? `${formatTime(selectedTime.startTime)} - ${formatTime(selectedTime.endTime)}` : null,
            selectedVenue: selectedVenue,
            extractedDate: extractedDateTime.date,
            preferences: proposals.preferences,
          }),
        });

        if (generateResponse.ok) {
          const generateData = await generateResponse.json();
          eventTitle = generateData.title || 'Event';
          eventDescription = generateData.description || '';
        } else {
          throw new Error('Failed to generate event details');
        }
      } catch (error) {
        console.error('Error generating event details:', error);
        // Fallback to simple title/description
        eventTitle = selectedVenue ? `${selectedVenue.name} Event` : 'Event';
        eventDescription = `Event scheduled for ${extractedDateTime.date}`;
        if (selectedVenue) {
          eventDescription += `\n\nVenue: ${selectedVenue.name}`;
          if (selectedVenue.address) {
            eventDescription += `\nAddress: ${selectedVenue.address}`;
          }
          if (selectedVenue.website) {
            eventDescription += `\nWebsite: ${selectedVenue.website}`;
          }
        }
      }

      // Step 2: Create calendar event
      try {
        // Build datetime strings in ISO format
        const eventDate = new Date(extractedDateTime.date);
        const [startHours, startMinutes] = selectedTime.startTime.split(':');
        const [endHours, endMinutes] = selectedTime.endTime.split(':');

        eventDate.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
        const startDateTime = eventDate.toISOString();

        eventDate.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
        const endDateTime = eventDate.toISOString();

        // Build description with links
        let fullDescription = eventDescription;
        if (selectedVenue) {
          if (selectedVenue.website) {
            fullDescription += `\n\n📍 Venue Details:\n${selectedVenue.name}`;
            if (selectedVenue.address) {
              fullDescription += `\n${selectedVenue.address}`;
            }
            if (selectedVenue.phone) {
              fullDescription += `\nPhone: ${selectedVenue.phone}`;
            }
            fullDescription += `\nWebsite: ${selectedVenue.website}`;
          }
        }

        const eventData = {
          summary: eventTitle,
          description: fullDescription,
          start: { dateTime: startDateTime },
          end: { dateTime: endDateTime },
          location: selectedVenue?.address || selectedVenue?.name || undefined,
        };

        const calendarResponse = await fetch('/api/calendar/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventData,
            // Tokens will be read from environment variables if not provided
          }),
        });

        if (!calendarResponse.ok) {
          const errorData = await calendarResponse.json();
          console.error('Error creating calendar event:', errorData);
          throw new Error(errorData.message || 'Failed to create calendar event');
        }

        const calendarData = await calendarResponse.json();
        console.log('Calendar event created:', calendarData);

        // Step 3: Initiate Vapi phone call to make reservation
        if (selectedVenue?.phone || proposals.preferences?.numberOfGuests) {
          // Format date for Vapi (YYYY-MM-DD)
          const reservationDate = new Date(extractedDateTime.date).toISOString().split('T')[0];

          // Format time for Vapi (e.g., "7:30 PM")
          const reservationTime = formatTime(selectedTime.startTime);

          // Extract number of guests from preferences
          const numberOfGuests = proposals.preferences?.numberOfGuests
            ? parseInt(proposals.preferences.numberOfGuests.replace(/\D/g, '')) || 2
            : 2;

          // Show UI feedback that we're initiating the call
          const initiatingMessage: Message = {
            id: (Date.now() + 1).toString(),
            sender: 'alfred',
            text: `📞 Initiating reservation call to ${selectedVenue?.name || 'the restaurant'}...`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, initiatingMessage]);

          try {
            console.log('[AlfredChat] Initiating Vapi reservation call...');
            console.log('[AlfredChat] Restaurant:', selectedVenue?.phone);
            console.log('[AlfredChat] Date:', reservationDate);
            console.log('[AlfredChat] Time:', reservationTime);
            console.log('[AlfredChat] Guests:', numberOfGuests);

            const vapiResponse = await fetch('/api/call/reserve', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                date: reservationDate,
                time: reservationTime,
                people: numberOfGuests,
                restaurantPhone: selectedVenue?.phone, // Use venue phone if available
                venueName: selectedVenue?.name,
              }),
            });

            if (vapiResponse.ok) {
              const vapiData = await vapiResponse.json();
              console.log('[AlfredChat] ✅ Vapi call initiated:', vapiData);

              // Replace initiating message with success message
              setMessages(prev => prev.map(msg =>
                msg.id === initiatingMessage.id
                  ? {
                      ...msg,
                      text: `✅ Call initiated successfully! I've called ${selectedVenue?.name || 'the restaurant'} to make your reservation for ${numberOfGuests} people on ${reservationDate} at ${reservationTime}. Call ID: ${vapiData.callId || 'N/A'}`,
                    }
                  : msg
              ));
            } else {
              const errorData = await vapiResponse.json();
              console.error('[AlfredChat] Error initiating Vapi call:', errorData);

              // Replace initiating message with error message
              setMessages(prev => prev.map(msg =>
                msg.id === initiatingMessage.id
                  ? {
                      ...msg,
                      text: `⚠️ Could not initiate call: ${errorData.message || errorData.error || 'Unknown error'}. The calendar event was created successfully.`,
                    }
                  : msg
              ));
            }
          } catch (error) {
            console.error('[AlfredChat] Error initiating Vapi call:', error);

            // Replace initiating message with error message
            setMessages(prev => prev.map(msg =>
              msg.id === initiatingMessage.id
                ? {
                    ...msg,
                    text: `⚠️ Error initiating call: ${error instanceof Error ? error.message : 'Unknown error'}. The calendar event was created successfully.`,
                  }
                : msg
            ));
          }
        }
      } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error; // Re-throw to show error to user
      }

      // Step 4: Close the chat
      setIsTyping(false);
      onClose();
    } catch (error) {
      console.error('Error in approval process:', error);
      setIsTyping(false);
      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'alfred',
        text: `Sorry, there was an error creating the calendar event. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Simple test call using mocked data (no calendar event)
  const handleTestCall = async () => {
    const testDate = new Date();
    const isoDate = testDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const testTime = '7:00 PM';
    const testPeople = 2;

    const initiatingMessage: Message = {
      id: (Date.now() + 1).toString(),
      sender: 'alfred',
      text: `📞 Initiating TEST reservation call for ${testPeople} people on ${isoDate} at ${testTime}...`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, initiatingMessage]);

    try {
      console.log('[AlfredChat] Initiating TEST Vapi call...');

      // We intentionally omit restaurantPhone so the backend can use VAPI_TARGET_PHONE_NUMBER / env fallback
      const response = await fetch('/api/call/reserve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: isoDate,
          time: testTime,
          people: testPeople,
          venueName: 'Test Restaurant',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[AlfredChat] ✅ TEST Vapi call initiated:', data);

        setMessages(prev => prev.map(msg =>
          msg.id === initiatingMessage.id
            ? {
                ...msg,
                text: `✅ TEST call initiated successfully! Call ID: ${data.callId || 'N/A'}`,
              }
            : msg
        ));
      } else {
        const errorData = await response.json();
        console.error('[AlfredChat] Error initiating TEST Vapi call:', errorData);

        setMessages(prev => prev.map(msg =>
          msg.id === initiatingMessage.id
            ? {
                ...msg,
                text: `⚠️ TEST call failed: ${errorData.message || errorData.error || 'Unknown error'}`,
              }
            : msg
        ));
      }
    } catch (error) {
      console.error('[AlfredChat] Error initiating TEST Vapi call:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === initiatingMessage.id
          ? {
              ...msg,
              text: `⚠️ TEST call error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
          : msg
      ));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-5xl h-[90vh] max-h-[900px] flex flex-col shadow-2xl border-0 overflow-hidden bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg ring-2 ring-white/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Alfred</h2>
              <p className="text-sm opacity-90">Your AI Life Assistant</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="text-white hover:bg-white/20 rounded-full w-10 h-10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gradient-to-b from-gray-50 to-white">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {message.sender === 'alfred' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] sm:max-w-[70%] rounded-2xl p-4 shadow-md ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-sm'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-tl-sm'
                }`}
              >
                {message.sender === 'alfred' ? (
                  <div className="prose prose-sm max-w-none prose-headings:font-bold prose-p:text-gray-800 prose-strong:text-gray-900">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0 text-[15px] leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-2 text-[15px]">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-2 text-[15px]">{children}</ol>,
                        li: ({ children }) => <li className="ml-2">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-indigo-700">{children}</code>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-gray-900">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-gray-900">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2 first:mt-0 text-gray-900">{children}</h3>,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-line text-[15px] leading-relaxed">{message.text}</p>
                )}
                <p className={`text-xs mt-2 ${message.sender === 'user' ? 'text-indigo-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white text-xs font-semibold">You</span>
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start gap-3 animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-md border border-gray-200">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Extracted Date/Time Display */}
        {extractedDateTime && (extractedDateTime.hasDate || extractedDateTime.hasTime) && (
          <div className="px-4 sm:px-6 py-4 border-t bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-indigo-600" />
              <p className="text-sm font-semibold text-indigo-900">Extracted Information</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {extractedDateTime.hasDate && extractedDateTime.date && (
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-indigo-200">
                  <span className="text-xs font-medium text-indigo-700">📅</span>
                  <span className="text-sm text-indigo-900 font-medium">
                    {new Date(extractedDateTime.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              )}
              {extractedDateTime.hasTime && extractedDateTime.time && (
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-indigo-200">
                  <span className="text-xs font-medium text-indigo-700">⏰</span>
                  <span className="text-sm text-indigo-900 font-medium">{extractedDateTime.time}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Proposals Display */}
        {proposals && (proposals.hasTimeProposals || proposals.hasVenueProposals || proposals.hasPreferences) && (
          <div className="px-4 sm:px-6 py-4 border-t bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 max-h-[400px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <p className="text-base font-bold text-emerald-900">Extracted Information</p>
            </div>
            
            {/* Time Proposals List */}
            {proposals.hasTimeProposals && proposals.timeProposals && proposals.timeProposals.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-900">Time Options ({proposals.timeProposals.length})</p>
                </div>
                <div className="space-y-2">
                  {proposals.timeProposals.map((timeOption, index) => {
                    const formatTime = (time24: string) => {
                      if (!time24) return '';
                      const [hours, minutes] = time24.split(':');
                      const hour = parseInt(hours);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const hour12 = hour % 12 || 12;
                      return `${hour12}:${minutes} ${ampm}`;
                    };
                    
                    return (
                      <label
                        key={index}
                        className={`flex items-center gap-3 bg-white rounded-xl p-4 shadow-md border-2 cursor-pointer transition-all ${
                          selectedTimeIndex === index
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="timeOption"
                          value={index}
                          checked={selectedTimeIndex === index}
                          onChange={() => setSelectedTimeIndex(index)}
                          className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 focus:ring-2"
                        />
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-lg font-bold text-emerald-700">
                            {formatTime(timeOption.startTime)} - {formatTime(timeOption.endTime)}
                          </div>
                          {timeOption.duration && (
                            <span className="text-sm text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full font-medium">
                              {timeOption.duration}
                            </span>
                          )}
                          {timeOption.label && (
                            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                              {timeOption.label}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Venue Proposals List */}
            {proposals.hasVenueProposals && proposals.venueProposals && proposals.venueProposals.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-900">Venue Options ({proposals.venueProposals.length})</p>
                </div>
                <div className="space-y-2">
                  {proposals.venueProposals.map((venue, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-3 bg-white rounded-xl p-4 shadow-md border-2 cursor-pointer transition-all ${
                        selectedVenueIndex === index
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-emerald-200 hover:border-emerald-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="venueOption"
                        value={index}
                        checked={selectedVenueIndex === index}
                        onChange={() => setSelectedVenueIndex(index)}
                        className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 focus:ring-2 mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{venue.name}</h3>
                            {venue.rating && (
                              <div className="flex items-center gap-1 mb-2">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm font-medium text-gray-700">{venue.rating}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {venue.address && (
                          <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {venue.address}
                          </p>
                        )}
                        {venue.phone && (
                          <p className="text-sm text-gray-600 mb-2">{venue.phone}</p>
                        )}
                        {venue.features && (
                          <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded-lg">{venue.features}</p>
                        )}
                        {venue.website && (
                          <a 
                            href={venue.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Visit website <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {/* Approve Button */}
            {(proposals.hasTimeProposals || proposals.hasVenueProposals) && (
              <div className="mt-4 pt-4 border-t border-emerald-200 space-y-3">
                <Button
                  onClick={handleApproveSelection}
                  disabled={
                    (selectedTimeIndex === null && selectedVenueIndex === null) ||
                    !extractedDateTime?.date
                  }
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-5 w-5" />
                  Approve Selection
                </Button>
                {!extractedDateTime?.date && (
                  <p className="text-xs text-gray-500 text-center">
                    Please wait for date information to be extracted
                  </p>
                )}
              </div>
            )}

            {/* Preferences */}
            {proposals.hasPreferences && proposals.preferences && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <p className="text-sm font-semibold text-purple-900">Preferences</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-purple-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {proposals.preferences.partyTheme && (
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 font-medium">Theme:</span>
                        <span className="text-gray-700">{proposals.preferences.partyTheme}</span>
                      </div>
                    )}
                    {proposals.preferences.budget && (
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 font-medium">Budget:</span>
                        <span className="text-gray-700">{proposals.preferences.budget}</span>
                      </div>
                    )}
                    {proposals.preferences.numberOfGuests && (
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 font-medium">Guests:</span>
                        <span className="text-gray-700">{proposals.preferences.numberOfGuests}</span>
                      </div>
                    )}
                    {proposals.preferences.ageGroup && (
                      <div className="flex items-start gap-2">
                        <span className="text-purple-600 font-medium">Age Group:</span>
                        <span className="text-gray-700">{proposals.preferences.ageGroup}</span>
                      </div>
                    )}
                    {proposals.preferences.specialRequirements && (
                      <div className="col-span-full flex items-start gap-2">
                        <span className="text-purple-600 font-medium">Special Requirements:</span>
                        <span className="text-gray-700">{proposals.preferences.specialRequirements}</span>
                      </div>
                    )}
                    {proposals.preferences.other && (
                      <div className="col-span-full flex items-start gap-2">
                        <span className="text-purple-600 font-medium">Other:</span>
                        <span className="text-gray-700">{proposals.preferences.other}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="px-4 sm:px-6 py-3 border-t bg-gradient-to-r from-indigo-50 to-purple-50">
            <p className="text-xs font-semibold text-gray-700 mb-3">💡 Quick prompts:</p>
            <div className="flex gap-2 flex-wrap">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputValue(prompt)}
                  className="text-sm px-4 py-2 bg-white text-indigo-700 rounded-full hover:bg-indigo-100 hover:text-indigo-800 transition-all shadow-sm hover:shadow-md border border-indigo-200 font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input + Test Call */}
        <div className="p-4 sm:p-6 border-t bg-white">
          <div className="flex justify-end mb-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestCall}
              className="hidden text-xs h-8 px-3 border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50"
            >
              Test Vapi Call (mock data)
            </Button>
          </div>
          <div className="flex gap-3 items-end">
            <Button
              variant="outline"
              size="icon"
              className={`flex-shrink-0 w-12 h-12 rounded-full transition-all ${
                isRecording 
                  ? 'bg-red-100 border-red-400 text-red-600 animate-pulse shadow-lg' 
                  : 'hover:bg-gray-100 border-gray-300'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
              onClick={handleVoiceInput}
            >
              <Mic className={`h-5 w-5 ${isRecording ? 'text-red-600' : ''}`} />
            </Button>
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type your message or use voice..."
                rows={1}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-[15px] min-h-[52px] max-h-32 overflow-y-auto"
                style={{ 
                  height: 'auto',
                  minHeight: '52px'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                }}
              />
              {inputValue && (
                <button
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}


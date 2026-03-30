import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, Settings, Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DOMPurify from 'dompurify';
import '../styles/ai-companion.css';

interface Message {
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

interface ChatSettings {
  apiUrl: string;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  debugMode: boolean;
}

const AICompanion: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => {
    // Use crypto API for secure session ID generation
    const array = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
      return 'session_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    // Fallback
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  });
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'error'>('online');
  const [settings, setSettings] = useState<ChatSettings>({
    apiUrl: 'https://csaiteam.app.n8n.cloud/webhook/df8223bf-119c-44d5-9bbf-f74ae26828e8/chat',
    theme: 'auto',
    fontSize: 'medium',
    debugMode: false
  });
  const [showSettings, setShowSettings] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug log to ensure component is rendering
  useEffect(() => {
    console.log('AI Companion component mounted');
  }, []);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('aiCompanionSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: ChatSettings) => {
    setSettings(newSettings);
    localStorage.setItem('aiCompanionSettings', JSON.stringify(newSettings));
    setShowSettings(false);
  };

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Generate simulated response
  const generateSimulatedResponse = (message: string): string => {
    const responses = [
      `I understand you said: "${message}". How can I help you with that?`,
      `That's interesting! You mentioned: "${message}". Tell me more about it.`,
      `I see you're asking about: "${message}". Let me think about that...`,
      `Thanks for sharing: "${message}". What would you like to know more about?`,
      `I heard you say: "${message}". That's a great question!`,
      `You mentioned: "${message}". I'd be happy to help you with that.`,
      `Interesting point about: "${message}". What else would you like to discuss?`,
      `I understand: "${message}". How can I assist you further?`
    ];
    
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return `Hello! Nice to meet you. You said: "${message}". How are you doing today?`;
    } else if (lowerMessage.includes('help')) {
      return `I'd be happy to help! You mentioned: "${message}". What specific assistance do you need?`;
    } else if (lowerMessage.includes('thank')) {
      return `You're welcome! You said: "${message}". Is there anything else I can help you with?`;
    } else if (lowerMessage.includes('?')) {
      return `That's a great question: "${message}". Let me think about the best way to answer that.`;
    } else {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  };

  // Parse streaming JSON response from n8n
  const parseStreamingResponse = (textData: string): string => {
    // Check if this looks like n8n streaming format
    if (!textData.includes('"type"') || !textData.includes('"content"')) {
      return textData;
    }

    let fullMessage = '';
    
    // Extract all "content":"..." values using regex
    // This pattern matches: "content":"any text here"
    const contentPattern = /"content":"((?:[^"\\]|\\.)*)"/g;
    let match;
    
    while ((match = contentPattern.exec(textData)) !== null) {
      if (match[1]) {
        // Unescape the content
        let content = match[1];
        try {
          // Use JSON.parse to properly unescape the string
          content = JSON.parse('"' + content + '"');
        } catch (e) {
          // If JSON.parse fails, do manual unescaping
          content = content
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        }
        fullMessage += content;
      }
    }
    
    // If regex didn't find anything, try line-by-line JSON parsing
    if (!fullMessage) {
      const lines = textData.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith('{')) continue;
        
        try {
          const parsed = JSON.parse(trimmedLine);
          if (parsed.type === 'item' && parsed.content) {
            fullMessage += parsed.content;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
    
    return fullMessage.trim() || textData;
  };

  // Send message to webhook
  const sendToWebhook = async (message: string): Promise<any> => {
    const approaches = [
      {
        name: 'JSON with sessionId and chatInput',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            chatInput: message
          })
        }
      },
      {
        name: 'Form Data with sessionId and chatInput',
        options: {
          method: 'POST',
          body: (() => {
            const formData = new FormData();
            formData.append('sessionId', sessionId);
            formData.append('chatInput', message);
            return formData;
          })()
        }
      },
      {
        name: 'URL Encoded with sessionId and chatInput',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `sessionId=${encodeURIComponent(sessionId)}&chatInput=${encodeURIComponent(message)}`
        }
      }
    ];

    for (const approach of approaches) {
      try {
        const response = await fetch(settings.apiUrl, approach.options);
        
        if (response.ok) {
          const textData = await response.text();
          
          // Debug: log raw response
          console.log('Raw webhook response:', textData.substring(0, 500));
          
          // First, try to parse as streaming JSON (n8n format)
          const parsedStreamContent = parseStreamingResponse(textData);
          
          // Debug: log parsed content
          console.log('Parsed content:', parsedStreamContent.substring(0, 200));
          
          // If we got meaningful content from streaming parse, return it
          if (parsedStreamContent && parsedStreamContent !== textData && parsedStreamContent.length > 0) {
            return {
              message: parsedStreamContent,
              sessionId: sessionId,
              timestamp: new Date().toISOString(),
              source: 'n8n-stream'
            };
          }
          
          // Try to parse as single JSON object
          try {
            const data = JSON.parse(textData);
            
            // Check if this is a real AI response from n8n
            if (data.output) {
              return {
                message: data.output,
                sessionId: sessionId,
                timestamp: new Date().toISOString(),
                source: 'n8n'
              };
            }
            if (data.message && data.message !== 'firstEntryJson') {
              return data;
            }
          } catch (e) {
            // Not single JSON, use the parsed stream content or raw text
          }
          
          // Handle special responses
          if (textData === 'firstEntryJson') {
            const simulatedResponse = generateSimulatedResponse(message);
            return { 
              message: `🤖 ${simulatedResponse}\n\n⚠️ Note: The n8n webhook is returning "firstEntryJson" which indicates the chat workflow needs to be properly configured.`,
              type: 'firstEntry',
              sessionId: sessionId,
              simulated: true
            };
          }
          
          // If parsing didn't extract anything different, return the parsed content anyway
          // This handles the case where the content IS the full response
          if (parsedStreamContent && parsedStreamContent.length > 0) {
            return { message: parsedStreamContent };
          }
          
          // Return raw text as last resort
          return { message: textData };
        }
      } catch (error) {
        console.error(`${approach.name} failed:`, error);
        continue;
      }
    }
    
    throw new Error('All webhook approaches failed');
  };

  // Send message
  const sendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || isTyping) return;

    // Add user message
    const userMessage: Message = {
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await sendToWebhook(message);
      
      const aiMessage: Message = {
        content: response.message || 'I received your message but couldn\'t generate a proper response.',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setConnectionStatus('online');
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setConnectionStatus('error');
    } finally {
      setIsTyping(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear chat
  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([]);
    }
  };

  // Format message content with XSS protection
  const formatMessageContent = (content: string) => {
    // First escape HTML entities
    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br/>');
    
    // Then sanitize with DOMPurify to prevent XSS
    return DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: ['br', 'strong', 'em', 'u', 'p', 'code', 'pre'],
      ALLOWED_ATTR: []
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50" style={{ zIndex: 9999 }}>
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
            style={{ 
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <MessageCircle className="h-6 w-6 text-white" />
          </Button>
        </div>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50" style={{ zIndex: 9999 }}>
          <Card className={`w-80 h-96 bg-gray-900 border-gray-700 shadow-2xl border transition-all duration-300 rounded-2xl ${
            isMinimized ? 'h-16' : ''
          }`} style={{ 
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '320px',
            height: isMinimized ? '64px' : '384px',
            backgroundColor: '#111827',
            borderColor: '#374151',
            borderRadius: '16px'
          }}>
            {/* Header */}
            <CardHeader className="p-4 pb-2 border-b border-gray-700 bg-gray-800 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-200">AI Companion</h3>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'online' ? 'bg-green-500' : 
                        connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-400">
                        {connectionStatus === 'online' ? 'Online' : 
                         connectionStatus === 'error' ? 'Error' : 'Offline'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSettings(!showSettings)}
                    className="h-8 w-8 p-0"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="h-8 w-8 p-0"
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Settings Panel */}
            {showSettings && (
              <div className="p-4 border-b border-gray-700 bg-gray-800">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-300">Webhook URL</label>
                    <Input
                      value={settings.apiUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, apiUrl: e.target.value }))}
                      className="h-8 text-xs bg-gray-700 border-gray-600 text-gray-200 rounded-lg"
                      placeholder="Enter webhook URL"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSettings(false)}
                      className="text-xs h-7 border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveSettings(settings)}
                      className="text-xs h-7 bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Content */}
            {!isMinimized && (
              <CardContent className="p-0 flex flex-col h-full bg-gray-900">
                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-64 bg-gray-900">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                      <p>Start a conversation with your AI companion!</p>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                            message.sender === 'user'
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                              : 'bg-gray-800 text-gray-200 border border-gray-700'
                          }`}
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: formatMessageContent(message.content)
                            }}
                          />
                          <div className={`text-xs mt-1 ${
                            message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-800 border border-gray-700 p-3 rounded-2xl">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-2xl">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 text-sm bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400 rounded-xl"
                      disabled={isTyping}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isTyping}
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">
                      {inputMessage.length}/2000
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearChat}
                      className="text-xs h-6 px-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </>
  );
};

export default AICompanion;

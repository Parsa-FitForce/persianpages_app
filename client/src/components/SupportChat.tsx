import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface SupportChatProps {
  appId: string;
  supportUrl: string;
  user?: { name: string; email: string } | null;
  theme?: {
    primary: string;     // e.g. "bg-blue-500"
    primaryHover: string; // e.g. "hover:bg-blue-600"
    text: string;         // e.g. "text-white"
  };
  buttonPosition?: string; // e.g. "bottom-6 right-6"
}

interface Message {
  id: string;
  sender: 'visitor' | 'agent';
  content: string;
  createdAt: string;
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h12M12 6l6 6-6 6" />
    </svg>
  );
}

const DEFAULT_THEME = {
  primary: 'bg-blue-500',
  primaryHover: 'hover:bg-blue-600',
  text: 'text-white',
};

export default function SupportChat({
  appId,
  supportUrl,
  user,
  theme = DEFAULT_THEME,
  buttonPosition = 'bottom-6 right-6',
}: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [conversationId, setConversationId] = useState<string | null>(() =>
    localStorage.getItem(`support_conversation_${appId}`)
  );
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(!!conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update name/email when user changes
  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user?.name, user?.email]);

  // Poll for messages when open and conversation exists
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`${supportUrl}/api/conversations/${conversationId}/messages`);
        if (!res.ok) return;
        const data = await res.json();
        setMessages(prev => {
          // Keep optimistic messages not yet confirmed by server
          const serverIds = new Set(data.messages.map((m: Message) => m.id));
          const pending = prev.filter(m => m.id.startsWith('temp-') && !serverIds.has(m.id));
          return [...data.messages, ...pending];
        });
      } catch {
        // silently ignore poll errors
      }
    };

    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, conversationId, supportUrl]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startConversation = async () => {
    if (!name.trim() || !email.trim() || !input.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${supportUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          visitorName: name.trim(),
          visitorEmail: email.trim(),
          userId: user ? undefined : undefined,
          message: input.trim(),
        }),
      });
      if (!res.ok) throw new Error('Failed to start conversation');
      const data = await res.json();
      setConversationId(data.conversationId);
      localStorage.setItem(`support_conversation_${appId}`, data.conversationId);
      setStarted(true);
      setInput('');
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;
    setSending(true);
    const content = input.trim();
    setInput('');

    // Optimistic add
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender: 'visitor',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await fetch(`${supportUrl}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();
      // Replace optimistic with real
      setMessages(prev =>
        prev.map(m => (m.id === optimistic.id ? data.message : m))
      );
    } catch {
      // Remove optimistic on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (started) sendMessage();
      else startConversation();
    }
  };

  const newConversation = () => {
    localStorage.removeItem(`support_conversation_${appId}`);
    setConversationId(null);
    setMessages([]);
    setStarted(false);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed ${buttonPosition} z-50 w-14 h-14 rounded-full ${theme.primary} ${theme.primaryHover} ${theme.text} shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105`}
        >
          <ChatIcon className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className={`fixed ${buttonPosition} z-50 w-full sm:w-[380px] h-[100dvh] sm:h-[500px] sm:rounded-2xl bg-white dark:bg-stone-900 shadow-2xl flex flex-col overflow-hidden border border-stone-200 dark:border-stone-700`}>
          {/* Header */}
          <div className={`${theme.primary} ${theme.text} px-4 py-3 flex items-center justify-between shrink-0`}>
            <span className="font-semibold text-sm">Support Chat</span>
            <div className="flex items-center gap-2">
              {started && (
                <button
                  onClick={newConversation}
                  className="text-xs opacity-80 hover:opacity-100 underline"
                >
                  New chat
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="hover:opacity-80">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages / Start form */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!started ? (
              <div className="space-y-3">
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Hi there! Send us a message and we'll get back to you shortly.
                </p>
                {!user && (
                  <>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Your email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </>
                )}
                {user && (
                  <p className="text-xs text-stone-500 dark:text-stone-500">
                    Chatting as <span className="font-medium text-stone-700 dark:text-stone-300">{user.name}</span>
                  </p>
                )}
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                        msg.sender === 'visitor'
                          ? `${theme.primary} ${theme.text}`
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-4">
                    Waiting for messages...
                  </p>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-stone-200 dark:border-stone-700 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={started ? 'Type a message...' : 'How can we help?'}
                rows={1}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-24"
              />
              <button
                onClick={started ? sendMessage : startConversation}
                disabled={sending || !input.trim() || (!started && (!name.trim() || !email.trim()))}
                className={`p-2 rounded-lg ${theme.primary} ${theme.primaryHover} ${theme.text} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

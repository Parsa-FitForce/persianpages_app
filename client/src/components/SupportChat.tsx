import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface SupportChatProps {
  appId: string;
  supportUrl: string;
  user?: { name: string; email: string } | null;
  locale?: 'en' | 'fa';
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

const STRINGS = {
  en: {
    header: 'Support Chat',
    greeting: "Hi there! Send us a message and we'll get back to you shortly.",
    namePlaceholder: 'Your name',
    emailPlaceholder: 'Your email',
    chattingAs: 'Chatting as',
    newChat: 'New chat',
    waiting: 'Waiting for messages...',
    typePlaceholder: 'Type a message...',
    helpPlaceholder: 'How can we help?',
  },
  fa: {
    header: '\u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u06CC',
    greeting: '\u0633\u0644\u0627\u0645! \u067E\u06CC\u0627\u0645 \u062E\u0648\u062F \u0631\u0627 \u0627\u0631\u0633\u0627\u0644 \u06A9\u0646\u06CC\u062F\u060C \u0628\u0647 \u0632\u0648\u062F\u06CC \u067E\u0627\u0633\u062E \u062E\u0648\u0627\u0647\u06CC\u0645 \u062F\u0627\u062F.',
    namePlaceholder: '\u0646\u0627\u0645 \u0634\u0645\u0627',
    emailPlaceholder: '\u0627\u06CC\u0645\u06CC\u0644 \u0634\u0645\u0627',
    chattingAs: '\u062F\u0631 \u062D\u0627\u0644 \u06AF\u0641\u062A\u06AF\u0648 \u0628\u0647 \u0639\u0646\u0648\u0627\u0646',
    newChat: '\u06AF\u0641\u062A\u06AF\u0648\u06CC \u062C\u062F\u06CC\u062F',
    waiting: '\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u067E\u06CC\u0627\u0645...',
    typePlaceholder: '\u067E\u06CC\u0627\u0645 \u062E\u0648\u062F \u0631\u0627 \u0628\u0646\u0648\u06CC\u0633\u06CC\u062F...',
    helpPlaceholder: '\u0686\u0637\u0648\u0631 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u0645 \u06A9\u0645\u06A9\u062A\u0627\u0646 \u06A9\u0646\u06CC\u0645\u061F',
  },
};

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

function SendIcon({ className, rtl }: { className?: string; rtl?: boolean }) {
  return (
    <svg className={`${className}${rtl ? ' rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  locale = 'en',
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

  const t = STRINGS[locale];
  const isRtl = locale === 'fa';
  // Use static class literals so Tailwind JIT can scan them
  const desktopPanelPosition = buttonPosition.includes('left-')
    ? 'sm:bottom-6 sm:left-6'
    : 'sm:bottom-6 sm:right-6';

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
          className={`fixed ${buttonPosition} z-[60] w-14 h-14 rounded-full ${theme.primary} ${theme.primaryHover} ${theme.text} shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105`}
        >
          <ChatIcon className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          dir={isRtl ? 'rtl' : undefined}
          className={`fixed inset-0 sm:inset-auto ${desktopPanelPosition} z-[60] sm:w-[380px] sm:h-[500px] sm:rounded-2xl bg-white dark:bg-stone-900 shadow-2xl flex flex-col overflow-hidden border border-stone-200 dark:border-stone-700`}
        >
          {/* Header */}
          <div className={`${theme.primary} ${theme.text} px-4 py-3 flex items-center justify-between shrink-0`}>
            <span className="font-semibold text-sm">{t.header}</span>
            <div className="flex items-center gap-2">
              {started && (
                <button
                  onClick={newConversation}
                  className="text-xs opacity-80 hover:opacity-100 underline"
                >
                  {t.newChat}
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
                  {t.greeting}
                </p>
                {!user && (
                  <>
                    <input
                      type="text"
                      placeholder={t.namePlaceholder}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      dir="ltr"
                      placeholder={t.emailPlaceholder}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className={`w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-blue-500${isRtl ? ' text-left placeholder:text-right' : ''}`}
                    />
                  </>
                )}
                {user && (
                  <p className="text-xs text-stone-500 dark:text-stone-500">
                    {t.chattingAs} <span className="font-medium text-stone-700 dark:text-stone-300">{user.name}</span>
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
                    {t.waiting}
                  </p>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-stone-200 dark:border-stone-700 shrink-0">
            <div className={`flex items-end gap-2${isRtl ? ' flex-row-reverse' : ''}`}>
              <textarea
                dir={isRtl ? 'rtl' : undefined}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={started ? t.typePlaceholder : t.helpPlaceholder}
                rows={1}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-24"
              />
              <button
                onClick={started ? sendMessage : startConversation}
                disabled={sending || !input.trim() || (!started && (!name.trim() || !email.trim()))}
                className={`p-2 rounded-lg ${theme.primary} ${theme.primaryHover} ${theme.text} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                <SendIcon className="w-5 h-5" rtl={isRtl} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

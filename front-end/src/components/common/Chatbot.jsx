import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import chatbotService from '../../services/chatbotService';

const SUGGESTIONS = [
  'What services do you offer?',
  'Tell me about consultations',
  'How do I book an appointment?',
];

const PAGE_LINKS = [
  { pattern: /\bServices page\b/gi, to: '/services', label: 'Services page' },
  { pattern: /\bConsultancy page\b/gi, to: '/consultancy', label: 'Consultancy page' },
  { pattern: /\bContact page\b/gi, to: '/contact', label: 'Contact page' },
  { pattern: /\bDashboard\b/gi, to: '/dashboard', label: 'Dashboard' },
  { pattern: /\/services\b/gi, to: '/services', label: 'Services page' },
  { pattern: /\/consultancy\b/gi, to: '/consultancy', label: 'Consultancy page' },
  { pattern: /\/contact\b/gi, to: '/contact', label: 'Contact page' },
  { pattern: /\/dashboard(?:\/[\w-]*)?/gi, to: '/dashboard', label: 'Dashboard' },
];

const resolveMarkdownTarget = (text = '', url = '') => {
  const hay = `${text} ${url}`.toLowerCase();
  if (hay.includes('dashboard') || hay.includes('booking')) {
    return { to: '/dashboard', label: 'Dashboard' };
  }
  if (hay.includes('consult')) {
    return { to: '/consultancy', label: 'Consultancy page' };
  }
  if (hay.includes('contact')) {
    return { to: '/contact', label: 'Contact page' };
  }
  if (hay.includes('service')) {
    return { to: '/services', label: 'Services page' };
  }
  if (url.startsWith('/')) {
    return { to: url.split('?')[0], label: text.replace(/^\/+/, '') || url };
  }
  return null;
};

const renderBotText = (text) => {
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliest = null;

    const mdMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(remaining);
    if (mdMatch) {
      const resolved = resolveMarkdownTarget(mdMatch[1], mdMatch[2]);
      if (resolved) {
        earliest = {
          index: mdMatch.index,
          length: mdMatch[0].length,
          to: resolved.to,
          label: resolved.label,
        };
      } else {
        earliest = {
          index: mdMatch.index,
          length: mdMatch[0].length,
          to: null,
          label: mdMatch[1],
        };
      }
    }

    for (const link of PAGE_LINKS) {
      link.pattern.lastIndex = 0;
      const match = link.pattern.exec(remaining);
      if (!match) continue;
      if (!earliest || match.index < earliest.index) {
        earliest = {
          index: match.index,
          length: match[0].length,
          to: link.to,
          label: link.label,
        };
      }
    }

    if (!earliest) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (earliest.index > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, earliest.index)}</span>);
    }

    if (earliest.to) {
      parts.push(
        <Link
          key={key++}
          to={earliest.to}
          className="underline text-primary font-medium hover:opacity-80"
        >
          {earliest.label}
        </Link>
      );
    } else {
      parts.push(<span key={key++}>{earliest.label}</span>);
    }

    remaining = remaining.slice(earliest.index + earliest.length);
  }

  return parts;
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hello! Welcome to Aura Salone. Ask me about our services, consultations, or booking — I am happy to help.',
      sender: 'bot',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const location = useLocation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isLoading]);

  const hiddenRoutes = ['/login', '/register', '/forgot-password', '/verify-email'];
  if (hiddenRoutes.includes(location.pathname) || location.pathname.startsWith('/admin')) {
    return null;
  }

  const buildHistory = (msgs) =>
    msgs
      .filter((m) => m.sender === 'user' || m.sender === 'bot')
      .slice(-10)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

  const sendMessage = async (rawText) => {
    const text = rawText.trim();
    if (!text || isLoading) return;

    const userMsg = { id: Date.now(), text, sender: 'user' };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = buildHistory(messages);
      const res = await chatbotService.ask(text, history);
      const reply = res.data?.data?.reply || res.data?.reply;
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: reply || 'Sorry, I could not find an answer. Please try again.',
          sender: 'bot',
        },
      ]);
    } catch (error) {
      const errMsg =
        error.response?.data?.message ||
        'I am having trouble connecting right now. Please try again in a moment.';
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: errMsg, sender: 'bot' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in flex flex-col items-end">
      {isOpen && (
        <div className="bg-surface border border-outline-variant/30 luxury-shadow w-80 md:w-96 h-[500px] mb-4 flex flex-col transform transition-all duration-300 origin-bottom-right">
          <div className="bg-surface-container-highest px-4 py-4 border-b border-outline-variant/30 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined">support_agent</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-sm uppercase tracking-widest text-on-surface">
                  Aura Assistant
                </h3>
                <span className="font-label-sm text-xs text-primary flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-on-surface-variant hover:text-primary transition-colors"
              type="button"
              aria-label="Close chat"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-grow p-4 overflow-y-auto bg-surface flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] p-3 rounded-lg font-body-sm whitespace-pre-wrap leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-primary text-on-primary self-end rounded-tr-none'
                    : 'bg-surface-container-low text-on-surface self-start rounded-tl-none border border-outline-variant/30'
                }`}
              >
                {msg.sender === 'bot' ? renderBotText(msg.text) : msg.text}
              </div>
            ))}

            {isLoading && (
              <div className="max-w-[80%] p-3 rounded-lg font-body-sm bg-surface-container-low text-on-surface self-start rounded-tl-none border border-outline-variant/30 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
              </div>
            )}

            {messages.length === 1 && !isLoading && (
              <div className="flex flex-col gap-2 mt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="text-left text-xs font-label-sm px-3 py-2 border border-outline-variant/40 text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-surface border-t border-outline-variant/30">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about services, consults..."
                disabled={isLoading}
                maxLength={1000}
                className="flex-grow bg-surface-container-lowest border border-outline-variant px-4 py-2 text-on-surface focus:outline-none focus:border-primary font-body-sm transition-colors disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="bg-primary text-on-primary px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className={`w-14 h-14 rounded-full luxury-shadow flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isOpen
            ? 'bg-surface text-on-surface border border-outline-variant/30'
            : 'bg-primary text-on-primary'
        }`}
        aria-label={isOpen ? 'Minimize chat' : 'Open chat'}
      >
        <span className="material-symbols-outlined text-3xl">
          {isOpen ? 'keyboard_arrow_down' : 'chat'}
        </span>
      </button>
    </div>
  );
};

export default Chatbot;

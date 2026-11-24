import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowDown, RefreshCw, X } from 'lucide-react';
import MessageItem from './MessageItem.jsx';

const STARTER_PROMPTS = [
  {
    title: 'Explain a technical concept',
    prompt: 'Explain how JavaScript event loops, microtasks, and Promises work with a clear example.',
  },
  {
    title: 'Write & review code',
    prompt: 'Write a debounced search hook in React and explain when to use it.',
  },
  {
    title: 'Brainstorm product ideas',
    prompt: 'Give me 5 focused weekend SaaS ideas for independent developers and how to validate the first one.',
  },
  {
    title: 'Draft clear communication',
    prompt: 'Help me write a concise, polite project status update explaining a two-day delay due to API testing.',
  },
];

export default function MessageList({
  messages,
  isGenerating,
  isWaitingForFirstChunk,
  errorMessage,
  onDismissError,
  onRetryLast,
  onSelectStarter,
  onEditMessage,
  onDeleteMessage,
  onRegenerate,
}) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const autoScrollEnabledRef = useRef(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 80;
    autoScrollEnabledRef.current = nearBottom;
    setShowScrollButton(!nearBottom && messages.length > 0);
  };

  const hasUnansweredUserMessage =
    !isGenerating &&
    !isWaitingForFirstChunk &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'user';

  useEffect(() => {
    if (autoScrollEnabledRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: isGenerating ? 'auto' : 'smooth' });
    }
  }, [messages, isGenerating, isWaitingForFirstChunk, errorMessage, hasUnansweredUserMessage]);

  const scrollToBottom = () => {
    autoScrollEnabledRef.current = true;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollButton(false);
  };

  const lastAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return null;
  })();

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chat-scrollbar h-full overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 ? (
            <div className="flex min-h-[58vh] flex-col items-center justify-center py-8">
              <div
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-display text-lg font-bold text-white shadow-sm"
                aria-hidden="true"
              >
                S
              </div>
              <h1 className="text-balance text-center font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                How can Shah help you today?
              </h1>
              <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Ask a question, debug code, or draft ideas. Conversations save automatically in your browser.
              </p>

              <div className="mt-8 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => onSelectStarter(item.prompt)}
                    className="group rounded-2xl border border-slate-200/90 bg-white p-4 text-left transition-colors duration-150 hover:border-blue-500/60 hover:bg-blue-50/40 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-[#141C2E] dark:hover:border-blue-500/50 dark:hover:bg-[#18233A]"
                  >
                    <div className="font-display text-sm font-semibold text-slate-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
                      {item.title}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isLatestAssistant={msg.id === lastAssistantId}
                  isGenerating={isGenerating}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  onRegenerate={onRegenerate}
                />
              ))}

              {isWaitingForFirstChunk && (
                <div className="flex items-start gap-3.5" aria-live="polite" aria-label="Shah is typing">
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-200/90 bg-blue-50 font-display text-xs font-bold text-blue-700 dark:border-blue-800/70 dark:bg-[#18233A] dark:text-blue-300"
                    aria-hidden="true"
                  >
                    S
                  </div>
                  <div className="pt-1">
                    <div className="mb-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                      Shah
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-[#141C2E]">
                      <span className="typing-dot h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                      <span className="typing-dot typing-dot-2 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                      <span className="typing-dot typing-dot-3 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                      <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                        Thinking
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                    <span className="break-words">{errorMessage}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={onRetryLast}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-medium text-white transition-colors hover:bg-red-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Retry</span>
                    </button>
                    <button
                      type="button"
                      onClick={onDismissError}
                      aria-label="Dismiss error"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/50"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : (
                hasUnansweredUserMessage && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      <span className="break-words">
                        No response received for your last message.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onRetryLast}
                      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Retry response</span>
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <div ref={bottomRef} className="h-1" />
        </div>
      </div>

      {showScrollButton && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
          className="absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-[#141C2E] dark:text-slate-200 dark:hover:border-blue-500/60 dark:hover:bg-[#18233A] dark:hover:text-blue-300"
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

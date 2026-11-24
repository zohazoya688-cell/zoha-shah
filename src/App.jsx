import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  PanelLeftOpen,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import MessageList from './components/MessageList.jsx';
import MessageInput from './components/MessageInput.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import ExportMenu from './components/ExportMenu.jsx';
import { streamChatCompletion } from './utils/chatApi.js';
import {
  createConversation,
  createMessage,
  deriveConversationTitle,
  loadActiveConversationId,
  loadConversations,
  loadTheme,
  saveActiveConversationId,
  saveConversations,
  saveTheme,
} from './utils/storage.js';

export default function App() {
  const [conversations, setConversations] = useState(() => loadConversations());
  const [activeId, setActiveId] = useState(() => {
    const savedList = loadConversations();
    const savedActive = loadActiveConversationId();
    if (savedActive && savedList.some((c) => c.id === savedActive)) {
      return savedActive;
    }
    return savedList[0]?.id || null;
  });

  const [theme, setTheme] = useState(() => loadTheme());
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 1024;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isWaitingForFirstChunk, setIsWaitingForFirstChunk] = useState(false);
  const [errorsByConversation, setErrorsByConversation] = useState({});

  const [isEditingHeaderTitle, setIsEditingHeaderTitle] = useState(false);
  const [headerTitleDraft, setHeaderTitleDraft] = useState('');

  const abortControllerRef = useRef(null);
  const headerInputRef = useRef(null);

  // Sync theme class on <html> and persist to Local Storage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  // Persist conversations whenever they change
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Persist active conversation ID
  useEffect(() => {
    saveActiveConversationId(activeId);
  }, [activeId]);

  useEffect(() => {
    if (isEditingHeaderTitle && headerInputRef.current) {
      headerInputRef.current.focus();
      headerInputRef.current.select();
    }
  }, [isEditingHeaderTitle]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const activeErrorMessage = activeId ? errorsByConversation[activeId] || null : null;

  useEffect(() => {
    setIsEditingHeaderTitle(false);
  }, [activeId]);

  const clearConversationError = useCallback((conversationId) => {
    if (!conversationId) return;
    setErrorsByConversation((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const setConversationError = useCallback((conversationId, message) => {
    if (!conversationId) return;
    setErrorsByConversation((prev) => ({
      ...prev,
      [conversationId]: message,
    }));
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setIsWaitingForFirstChunk(false);
  }, []);

  const runAssistantStream = useCallback(
    async (conversationId, promptMessages) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsGenerating(true);
      setIsWaitingForFirstChunk(true);
      clearConversationError(conversationId);

      let assistantMessageId = null;

      try {
        await streamChatCompletion({
          messages: promptMessages,
          signal: controller.signal,
          onChunk: (accumulatedText) => {
            setIsWaitingForFirstChunk(false);

            if (!assistantMessageId) {
              const newAssistantMsg = createMessage('assistant', accumulatedText);
              assistantMessageId = newAssistantMsg.id;

              setConversations((prev) =>
                prev
                  .map((conv) =>
                    conv.id === conversationId
                      ? {
                          ...conv,
                          messages: [...conv.messages, newAssistantMsg],
                          updatedAt: Date.now(),
                        }
                      : conv
                  )
                  .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
              );
            } else {
              const targetId = assistantMessageId;
              setConversations((prev) =>
                prev.map((conv) =>
                  conv.id === conversationId
                    ? {
                        ...conv,
                        messages: conv.messages.map((m) =>
                          m.id === targetId ? { ...m, content: accumulatedText } : m
                        ),
                        updatedAt: Date.now(),
                      }
                    : conv
                )
              );
            }
          },
        });
      } catch (err) {
        if (err && err.name === 'AbortError') {
          return;
        }
        setConversationError(
          conversationId,
          err instanceof Error && err.message
            ? err.message
            : 'Unable to complete response. Please try again.'
        );
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsGenerating(false);
          setIsWaitingForFirstChunk(false);
        }
      }
    },
    [clearConversationError, setConversationError]
  );

  const handleSendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating) return;

      const userMessage = createMessage('user', trimmed);
      let targetConversationId = activeId;
      let historyForRequest = [];

      if (!activeConversation) {
        const newConv = createConversation(deriveConversationTitle(trimmed));
        newConv.messages = [userMessage];
        targetConversationId = newConv.id;
        historyForRequest = [userMessage];

        setConversations((prev) => [newConv, ...prev]);
        setActiveId(newConv.id);
      } else {
        const shouldAutoTitle =
          activeConversation.messages.length === 0 &&
          (!activeConversation.title || activeConversation.title === 'New chat');

        const updatedMessages = [...activeConversation.messages, userMessage];
        historyForRequest = updatedMessages;

        setConversations((prev) =>
          prev
            .map((conv) =>
              conv.id === activeConversation.id
                ? {
                    ...conv,
                    title: shouldAutoTitle
                      ? deriveConversationTitle(trimmed)
                      : conv.title,
                    messages: updatedMessages,
                    updatedAt: Date.now(),
                  }
                : conv
            )
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        );
      }

      await runAssistantStream(targetConversationId, historyForRequest);
    },
    [activeConversation, activeId, isGenerating, runAssistantStream]
  );

  const handleNewChat = useCallback(() => {
    if (isGenerating) {
      stopGeneration();
    }

    // Reuse an existing empty conversation if one exists
    const existingEmpty = conversations.find((c) => c.messages.length === 0);
    if (existingEmpty) {
      setActiveId(existingEmpty.id);
      return;
    }

    const fresh = createConversation('New chat');
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
  }, [conversations, isGenerating, stopGeneration]);

  const handleSelectConversation = useCallback(
    (id) => {
      if (id === activeId) return;
      if (isGenerating) {
        stopGeneration();
      }
      setActiveId(id);
    },
    [activeId, isGenerating, stopGeneration]
  );

  const handleRenameConversation = useCallback((id, newTitle) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === id ? { ...conv, title: trimmed, updatedAt: Date.now() } : conv
      )
    );
  }, []);

  const handleDeleteConversation = useCallback(
    (id) => {
      if (id === activeId && isGenerating) {
        stopGeneration();
      }
      clearConversationError(id);
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (id === activeId) {
          setActiveId(remaining[0]?.id || null);
        }
        return remaining;
      });
    },
    [activeId, clearConversationError, isGenerating, stopGeneration]
  );

  const handleClearAllConversations = useCallback(() => {
    if (isGenerating) {
      stopGeneration();
    }
    setErrorsByConversation({});
    setConversations([]);
    setActiveId(null);
  }, [isGenerating, stopGeneration]);

  const handleEditMessage = useCallback(
    async (messageId, newContent, shouldRegenerate) => {
      if (!activeConversation) return;

      const msgIndex = activeConversation.messages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const targetMsg = activeConversation.messages[msgIndex];
      const editedMessage = {
        ...targetMsg,
        content: newContent,
        editedAt: Date.now(),
      };

      let nextMessages;
      if (shouldRegenerate && targetMsg.role === 'user') {
        nextMessages = [...activeConversation.messages.slice(0, msgIndex), editedMessage];
      } else {
        nextMessages = activeConversation.messages.map((m) =>
          m.id === messageId ? editedMessage : m
        );
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation.id
            ? {
                ...conv,
                messages: nextMessages,
                updatedAt: Date.now(),
              }
            : conv
        )
      );

      if (shouldRegenerate && targetMsg.role === 'user') {
        await runAssistantStream(activeConversation.id, nextMessages);
      }
    },
    [activeConversation, runAssistantStream]
  );

  const handleDeleteMessage = useCallback(
    (messageId) => {
      if (!activeConversation) return;
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation.id
            ? {
                ...conv,
                messages: conv.messages.filter((m) => m.id !== messageId),
                updatedAt: Date.now(),
              }
            : conv
        )
      );
    },
    [activeConversation]
  );

  const handleRegenerate = useCallback(async () => {
    if (!activeConversation || isGenerating) return;
    const msgs = activeConversation.messages;
    if (msgs.length === 0) return;

    // Find the last user message and regenerate from there
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const truncated = msgs.slice(0, lastUserIndex + 1);
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversation.id
          ? { ...conv, messages: truncated, updatedAt: Date.now() }
          : conv
      )
    );

    await runAssistantStream(activeConversation.id, truncated);
  }, [activeConversation, isGenerating, runAssistantStream]);

  const handleRetryLast = useCallback(async () => {
    if (!activeConversation || isGenerating) return;
    const msgs = activeConversation.messages;
    if (msgs.length === 0) return;

    // If the last message is an assistant message (partial), truncate back to last user message
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.role === 'assistant') {
      await handleRegenerate();
    } else {
      await runAssistantStream(activeConversation.id, msgs);
    }
  }, [activeConversation, handleRegenerate, isGenerating, runAssistantStream]);

  const startHeaderRename = () => {
    if (!activeConversation) return;
    setHeaderTitleDraft(activeConversation.title || 'New chat');
    setIsEditingHeaderTitle(true);
  };

  const commitHeaderRename = () => {
    if (activeConversation && headerTitleDraft.trim()) {
      handleRenameConversation(activeConversation.id, headerTitleDraft.trim());
    }
    setIsEditingHeaderTitle(false);
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#F8FAFC] text-slate-900 dark:bg-[#0B0F19] dark:text-slate-100">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearAllConversations={handleClearAllConversations}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-sm sm:px-6 dark:border-slate-800/90 dark:bg-[#0F1523]/95">
          <div className="flex min-w-0 items-center gap-2.5">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar"
                title="Open sidebar"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-[#141C2E] dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-[#1B253B] dark:hover:text-blue-400"
              >
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            {isSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 lg:hidden dark:border-slate-800 dark:bg-[#141C2E] dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-[#1B253B] dark:hover:text-blue-400"
              >
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            {activeConversation ? (
              isEditingHeaderTitle ? (
                <div className="flex min-w-0 items-center gap-1 rounded-xl border border-blue-600 bg-white px-2.5 py-1 dark:border-blue-500 dark:bg-[#141C2E]">
                  <input
                    ref={headerInputRef}
                    type="text"
                    value={headerTitleDraft}
                    onChange={(e) => setHeaderTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitHeaderRename();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setIsEditingHeaderTitle(false);
                      }
                    }}
                    aria-label="Edit active conversation title"
                    className="w-40 min-w-0 bg-transparent text-sm font-medium text-slate-900 focus:outline-none sm:w-64 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={commitHeaderRename}
                    aria-label="Save title"
                    className="rounded-lg p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingHeaderTitle(false)}
                    aria-label="Cancel rename"
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startHeaderRename}
                  title="Click to rename conversation"
                  className="group flex min-w-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-[#141C2E]"
                >
                  <span className="truncate font-display text-sm font-semibold text-slate-900 sm:text-base dark:text-white">
                    {activeConversation.title || 'New chat'}
                  </span>
                  <Pencil
                    className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:text-blue-600 group-hover:opacity-100 dark:group-hover:text-blue-400"
                    aria-hidden="true"
                  />
                </button>
              )
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-display text-xs font-bold text-white"
                  aria-hidden="true"
                >
                  S
                </div>
                <span className="font-display text-base font-semibold text-slate-900 whitespace-nowrap dark:text-white">
                  Shah
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={handleNewChat}
                aria-label="Start new chat"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}
            <ExportMenu conversation={activeConversation} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {/* Main chat messages */}
        <main className="flex min-h-0 flex-1 flex-col">
          <MessageList
            messages={activeConversation?.messages || []}
            isGenerating={isGenerating}
            isWaitingForFirstChunk={isWaitingForFirstChunk}
            errorMessage={activeErrorMessage}
            onDismissError={() => activeId && clearConversationError(activeId)}
            onRetryLast={handleRetryLast}
            onSelectStarter={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onRegenerate={handleRegenerate}
          />

          <MessageInput
            isGenerating={isGenerating}
            onSend={handleSendMessage}
            onStop={stopGeneration}
          />
        </main>
      </div>
    </div>
  );
}

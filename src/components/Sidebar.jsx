import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  MessageSquare,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { groupConversationsByDate } from '../utils/storage.js';

export default function Sidebar({
  conversations,
  activeId,
  isOpen,
  onCloseMobile,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onClearAllConversations,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const editInputRef = useRef(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((conv) => {
      if ((conv.title || '').toLowerCase().includes(query)) return true;
      return conv.messages.some((m) => (m.content || '').toLowerCase().includes(query));
    });
  }, [conversations, searchQuery]);

  const grouped = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations]
  );

  const startRename = (conv, e) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
    setEditingId(conv.id);
    setEditingTitle(conv.title || 'New chat');
  };

  const commitRename = (id) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      onRenameConversation(id, trimmed);
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  return (
    <>
      {/* Mobile / Tablet backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Conversation history"
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] shrink-0 flex-col border-r border-slate-200/90 bg-white transition-transform duration-200 ease-out dark:border-slate-800/90 dark:bg-[#0F1523] lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        {/* Top sidebar bar */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200/90 px-4 dark:border-slate-800/90">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 font-display text-xs font-bold text-white"
              aria-hidden="true"
            >
              S
            </div>
            <span className="font-display text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap dark:text-white">
              Shah
            </span>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-400 dark:hover:bg-[#141C2E] dark:hover:text-white"
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* New chat & search */}
        <div className="space-y-3 p-3">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onCloseMobile();
            }}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New Chat</span>
          </button>

          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              aria-label="Search saved conversations"
              className="h-9 w-full rounded-xl border border-slate-200/90 bg-[#F8FAFC] pr-8 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-[#141C2E] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div className="chat-scrollbar flex-1 overflow-y-auto px-2 pb-3">
          {grouped.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {searchQuery ? 'No matching chats' : 'No saved chats yet'}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? 'Try a different keyword.'
                  : 'Start a conversation and it will save automatically.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.label}>
                  <h2 className="px-3 pb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {group.label}
                  </h2>
                  <ul className="space-y-0.5">
                    {group.items.map((conv) => {
                      const isActive = conv.id === activeId;
                      const isEditing = editingId === conv.id;
                      const isConfirmingDelete = confirmDeleteId === conv.id;

                      return (
                        <li key={conv.id}>
                          {isEditing ? (
                            <div className="flex items-center gap-1 rounded-xl border border-blue-600 bg-white px-2 py-1.5 dark:border-blue-500 dark:bg-[#141C2E]">
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitRename(conv.id);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelRename();
                                  }
                                }}
                                aria-label="Rename conversation"
                                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 focus:outline-none dark:text-slate-100"
                              />
                              <button
                                type="button"
                                onClick={() => commitRename(conv.id)}
                                aria-label="Save conversation name"
                                className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/60"
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelRename}
                                aria-label="Cancel rename"
                                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          ) : isConfirmingDelete ? (
                            <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs dark:border-red-900/60 dark:bg-red-950/40">
                              <span className="truncate font-medium text-red-700 dark:text-red-300">
                                Delete chat?
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteConversation(conv.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="rounded-lg bg-red-600 px-2 py-1 font-medium text-white transition-colors hover:bg-red-700"
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`group flex items-center gap-1 rounded-xl transition-colors duration-150 ${
                                isActive
                                  ? 'bg-blue-50/90 text-blue-950 dark:bg-[#18233A] dark:text-white'
                                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#141C2E]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectConversation(conv.id);
                                  if (window.innerWidth < 1024) onCloseMobile();
                                }}
                                className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2.5 text-left text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
                              >
                                <MessageSquare
                                  className={`h-4 w-4 shrink-0 ${
                                    isActive
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-slate-400 dark:text-slate-500'
                                  }`}
                                  aria-hidden="true"
                                />
                                <span className="truncate font-medium">
                                  {conv.title || 'New chat'}
                                </span>
                              </button>

                              <div
                                className={`flex items-center gap-0.5 pr-1.5 transition-opacity ${
                                  isActive
                                    ? 'opacity-100'
                                    : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => startRename(conv, e)}
                                  aria-label={`Rename ${conv.title || 'chat'}`}
                                  title="Rename"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-blue-100/70 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-[#22304D] dark:hover:text-blue-300"
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(null);
                                    setConfirmDeleteId(conv.id);
                                  }}
                                  aria-label={`Delete ${conv.title || 'chat'}`}
                                  title="Delete"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-100 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/60 dark:hover:text-red-300"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          {conversations.length > 0 && confirmClearAll ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs dark:border-red-900/60 dark:bg-red-950/40">
              <span className="font-medium text-red-700 dark:text-red-300">
                Clear all chats?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllConversations();
                    setConfirmClearAll(false);
                  }}
                  className="rounded bg-red-600 px-2.5 py-1 font-medium text-white hover:bg-red-700"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="rounded px-2 py-1 font-medium text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="tabular-nums">
                {conversations.length}{' '}
                {conversations.length === 1 ? 'conversation' : 'conversations'}
              </span>
              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="rounded px-2 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-red-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-300 whitespace-nowrap"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

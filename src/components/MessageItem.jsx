import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer.jsx';
import { formatMessageTime } from '../utils/storage.js';

export default function MessageItem({
  message,
  isLatestAssistant,
  isGenerating,
  onEditMessage,
  onDeleteMessage,
  onRegenerate,
}) {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setDraft(message.content);
  }, [message.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.focus();
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleSaveOnly = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onEditMessage(message.id, trimmed, false);
    setIsEditing(false);
  };

  const handleSaveAndRegenerate = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onEditMessage(message.id, trimmed, true);
    setIsEditing(false);
  };

  const timeLabel = formatMessageTime(message.createdAt);

  if (isUser) {
    return (
      <article
        aria-label="Your message"
        className="group flex flex-col items-end"
      >
        <div className="w-full max-w-[85%] sm:max-w-[75%]">
          {isEditing ? (
            <div className="rounded-2xl border border-blue-600 bg-white p-3 dark:border-blue-500 dark:bg-[#141C2E]">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 260)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setDraft(message.content);
                    setIsEditing(false);
                  }
                }}
                rows={2}
                aria-label="Edit message"
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-slate-900 focus:outline-none dark:text-slate-100"
              />
              <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(message.content);
                    setIsEditing(false);
                  }}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveOnly}
                  disabled={!draft.trim()}
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndRegenerate}
                  disabled={!draft.trim() || isGenerating}
                  className="inline-flex h-8 items-center rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
                >
                  Save &amp; Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-blue-600 px-4 py-3 text-[15px] leading-relaxed text-white shadow-xs dark:bg-blue-600 dark:text-white">
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}

          {/* Metadata & actions */}
          {!isEditing && (
            <div className="mt-1.5 flex items-center justify-end gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="tabular-nums">
                {timeLabel}
                {message.editedAt ? ' · Edited' : ''}
              </span>

              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onDeleteMessage(message.id)}
                    className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy message"
                    title="Copy"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(false);
                      setIsEditing(true);
                    }}
                    disabled={isGenerating}
                    aria-label="Edit message"
                    title="Edit"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isGenerating}
                    aria-label="Delete message"
                    title="Delete"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-100 hover:text-red-700 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-red-950/60 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </article>
    );
  }

  // Assistant message
  return (
    <article
      aria-label="Assistant message"
      className="group flex items-start gap-3.5"
    >
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-200/90 bg-blue-50 font-display text-xs font-bold text-blue-700 dark:border-blue-800/70 dark:bg-[#18233A] dark:text-blue-300"
        aria-hidden="true"
      >
        S
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-display font-semibold text-slate-900 dark:text-white">
            Shah
          </span>
          {timeLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{timeLabel}</span>
            </>
          )}
          {message.editedAt && (
            <>
              <span aria-hidden="true">·</span>
              <span>Edited</span>
            </>
          )}
        </div>

        {isEditing ? (
          <div className="rounded-xl border border-blue-600 bg-white p-3 dark:border-blue-500 dark:bg-[#141C2E]">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 260)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setDraft(message.content);
                  setIsEditing(false);
                }
              }}
              rows={3}
              aria-label="Edit assistant response"
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-slate-900 focus:outline-none dark:text-slate-100"
            />
            <div className="mt-2.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(message.content);
                  setIsEditing(false);
                }}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleSaveOnly}
                disabled={!draft.trim()}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}

        {!isEditing && (
          <div className="mt-2 flex items-center gap-1">
            {confirmDelete ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-red-700 dark:text-red-300">Delete message?</span>
                <button
                  type="button"
                  onClick={() => onDeleteMessage(message.id)}
                  className="rounded bg-red-600 px-2 py-0.5 font-medium text-white hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded px-2 py-0.5 font-medium text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy response"
                  title="Copy"
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                      <span className="text-blue-700 dark:text-blue-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    setIsEditing(true);
                  }}
                  disabled={isGenerating}
                  aria-label="Edit response"
                  title="Edit"
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Edit</span>
                </button>

                {isLatestAssistant && !isGenerating && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    aria-label="Regenerate response"
                    title="Regenerate"
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Regenerate</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isGenerating}
                  aria-label="Delete response"
                  title="Delete"
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-slate-500 transition-colors hover:bg-red-100 hover:text-red-700 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-red-950/60 dark:hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

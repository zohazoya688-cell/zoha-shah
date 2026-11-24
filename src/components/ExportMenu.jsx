import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Download, FileJson, FileText } from 'lucide-react';
import { exportConversation } from '../utils/exportChat.js';

export default function ExportMenu({ conversation }) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportedFormat, setExportedFormat] = useState(null);
  const containerRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  const hasMessages = Boolean(conversation && conversation.messages.length > 0);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [conversation?.id]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  if (!conversation) {
    return null;
  }

  const handleExport = (format) => {
    const ok = exportConversation(conversation, format);
    setIsOpen(false);
    if (ok) {
      setExportedFormat(format);
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
      feedbackTimerRef.current = setTimeout(() => {
        setExportedFormat(null);
      }, 1800);
    }
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => hasMessages && setIsOpen((prev) => !prev)}
        disabled={!hasMessages}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Export chat history"
        title={hasMessages ? 'Export chat history' : 'Send a message to export this chat'}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-slate-200/90 disabled:hover:bg-white disabled:hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-[#141C2E] dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-[#1B253B] dark:hover:text-blue-300 dark:disabled:hover:border-slate-800 dark:disabled:hover:bg-[#141C2E] dark:disabled:hover:text-slate-200 whitespace-nowrap"
      >
        {exportedFormat ? (
          <>
            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span className="hidden sm:inline text-blue-700 dark:text-blue-300">
              Exported
            </span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown
              className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform duration-150 sm:inline ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Export format"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-[#141C2E]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('json')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-blue-50/70 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-[#1B253B]"
          >
            <FileJson className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Export as JSON
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Structured data (.json)
              </div>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('txt')}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-blue-50/70 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-[#1B253B]"
          >
            <FileText className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                Export as Text
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Readable transcript (.txt)
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

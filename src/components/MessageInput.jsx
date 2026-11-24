import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';

export default function MessageInput({ isGenerating, onSend, onStop }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [text]);

  const submitMessage = () => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  return (
    <div className="border-t border-slate-200/90 bg-white/95 px-4 pt-3 pb-4 backdrop-blur-sm sm:px-6 dark:border-slate-800/90 dark:bg-[#0F1523]/95">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200/90 bg-[#F8FAFC] p-2 transition-colors focus-within:border-blue-600 focus-within:bg-white dark:border-slate-800 dark:bg-[#141C2E] dark:focus-within:border-blue-500 dark:focus-within:bg-[#141C2E]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message Shah..."
            aria-label="Message input"
            className="chat-scrollbar max-h-[180px] min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          {isGenerating ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              title="Stop generating"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submitMessage}
              disabled={!text.trim()}
              aria-label="Send message"
              title="Send message (Enter)"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Press <kbd className="font-mono">Enter</kbd> to send, <kbd className="font-mono">Shift + Enter</kbd> for a new line.
        </p>
      </div>
    </div>
  );
}

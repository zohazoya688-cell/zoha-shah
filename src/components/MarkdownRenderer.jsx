import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

function isSafeHref(url) {
  try {
    const parsed = new URL(url, 'https://example.com');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

function renderInline(text, keyPrefix) {
  if (!text) return null;
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${idx++}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key}
          className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[0.85em] text-blue-900 dark:bg-[#1B253B] dark:text-blue-300"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key} className="font-semibold text-slate-900 dark:text-white">
          {renderInline(token.slice(2, -2), `${key}-b`)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key} className="italic">
          {renderInline(token.slice(1, -1), `${key}-i`)}
        </em>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch && isSafeHref(linkMatch[2])) {
        parts.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 underline decoration-blue-600/40 underline-offset-2 transition-colors hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-400/40 dark:hover:text-blue-300"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-[#0F172A] text-slate-100 dark:border-slate-800 dark:bg-[#0D1322]">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/80 px-3.5 py-2 text-xs text-slate-300 dark:bg-[#141C2E]">
        <span className="font-mono lowercase">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-[13px] leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderMarkdownBlocks(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const elements = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1; // Skip closing fence
      elements.push(
        <CodeBlock key={`code-${blockKey++}`} language={lang} code={codeLines.join('\n')} />
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Headings
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const key = `h-${blockKey++}`;
      if (level === 1) {
        elements.push(
          <h3 key={key} className="mt-4 mb-2 font-display text-lg font-semibold text-slate-900 first:mt-0 dark:text-white">
            {renderInline(content, key)}
          </h3>
        );
      } else if (level === 2) {
        elements.push(
          <h4 key={key} className="mt-3.5 mb-1.5 font-display text-base font-semibold text-slate-900 first:mt-0 dark:text-white">
            {renderInline(content, key)}
          </h4>
        );
      } else {
        elements.push(
          <h5 key={key} className="mt-3 mb-1 font-display text-[15px] font-semibold text-slate-900 first:mt-0 dark:text-white">
            {renderInline(content, key)}
          </h5>
        );
      }
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      elements.push(
        <hr key={`hr-${blockKey++}`} className="my-4 border-slate-200 dark:border-slate-800" />
      );
      i += 1;
      continue;
    }

    // Blockquote (clean hairline box, no thick left bar)
    if (line.trimStart().startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trimStart().startsWith('> ')) {
        quoteLines.push(lines[i].trimStart().slice(2));
        i += 1;
      }
      const key = `bq-${blockKey++}`;
      elements.push(
        <blockquote
          key={key}
          className="my-3 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-[#141C2E] dark:text-slate-300"
        >
          {renderInline(quoteLines.join(' '), key)}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i += 1;
      }
      const key = `ul-${blockKey++}`;
      elements.push(
        <ul key={key} className="my-2.5 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
          {items.map((item, idx) => (
            <li key={`${key}-${idx}`}>{renderInline(item, `${key}-${idx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i += 1;
      }
      const key = `ol-${blockKey++}`;
      elements.push(
        <ol key={key} className="my-2.5 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed">
          {items.map((item, idx) => (
            <li key={`${key}-${idx}`}>{renderInline(item, `${key}-${idx}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph (collect consecutive non-special lines)
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trimStart().startsWith('```') &&
      !/^(#{1,3})\s+/.test(lines[i].trim()) &&
      !lines[i].trimStart().startsWith('> ') &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }

    const key = `p-${blockKey++}`;
    elements.push(
      <p key={key} className="my-2 text-[15px] leading-relaxed first:mt-0 last:mb-0">
        {paraLines.map((pLine, idx) => (
          <span key={`${key}-l-${idx}`}>
            {renderInline(pLine, `${key}-${idx}`)}
            {idx < paraLines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }

  return elements;
}

export default function MarkdownRenderer({ content }) {
  return (
    <div className="min-w-0 break-words text-slate-800 dark:text-slate-200 dark:tracking-[0.01em]">
      {renderMarkdownBlocks(content)}
    </div>
  );
}

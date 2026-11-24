import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

const SYSTEM_INSTRUCTION_BASE = [
  'You are Shah, a clear, accurate, and thoughtful AI assistant.',
  'Format responses using clean Markdown when helpful (headings, bullet lists, numbered steps, and fenced code blocks with language identifiers).',
  'Be concise by default, and expand with clear examples or step-by-step reasoning when the user asks for depth.',
].join(' ');

interface ChatMessageInput {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

interface NormalizedContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getCurrentDateContext(): string {
  const now = new Date();
  const gregorian = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(now);

  let hijri = '';
  try {
    hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(now);
  } catch {
    hijri = '';
  }

  return hijri
    ? `Current date (UTC): ${gregorian}. Approximate Hijri (Umm al-Qura) date: ${hijri} (actual Islamic date may vary by +/- 1 day depending on local moon sighting).`
    : `Current date (UTC): ${gregorian}.`;
}

function normalizeContents(messages: ChatMessageInput[]): NormalizedContent[] {
  const mapped: Array<{ role: 'user' | 'model'; text: string }> = messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    text: msg.content,
  }));

  // Drop any leading model messages so conversation history always begins with a user turn
  while (mapped.length > 0 && mapped[0].role !== 'user') {
    mapped.shift();
  }

  // Merge consecutive same-role messages (e.g., multiple unanswered user prompts) into alternating turns
  const normalized: NormalizedContent[] = [];
  for (const item of mapped) {
    const last = normalized[normalized.length - 1];
    if (last && last.role === item.role) {
      last.parts[0].text = `${last.parts[0].text}\n\n${item.text}`;
    } else {
      normalized.push({
        role: item.role,
        parts: [{ text: item.text }],
      });
    }
  }

  return normalized;
}

function mapErrorStatusAndMessage(error: unknown): { status: number; message: string } {
  const errObj = error as { status?: number; statusCode?: number; message?: string };
  let statusCode =
    typeof errObj?.status === 'number'
      ? errObj.status
      : typeof errObj?.statusCode === 'number'
        ? errObj.statusCode
        : 0;

  const rawMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  const lower = rawMessage.toLowerCase();

  if (!statusCode) {
    const codeMatch = /"code"\s*:\s*(\d{3})/.exec(rawMessage);
    if (codeMatch) {
      statusCode = Number(codeMatch[1]);
    }
  }

  if (
    statusCode === 400 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid')
  ) {
    return {
      status: 400,
      message:
        'The configured Gemini API key appears invalid. Please check your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (statusCode === 403 || lower.includes('permission_denied')) {
    return {
      status: 403,
      message:
        'Permission denied by Gemini API. Please verify your GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (statusCode === 429 || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      message:
        'Free-tier rate limit reached. Please wait a few seconds and click Retry, or check your API key quota in Settings > Secrets.',
    };
  }
  if (statusCode === 404 || lower.includes('not_found')) {
    return {
      status: 404,
      message: `Requested Gemini model (${PRIMARY_MODEL}) was not found or is unavailable.`,
    };
  }
  if (
    statusCode === 503 ||
    statusCode === 504 ||
    lower.includes('unavailable') ||
    lower.includes('overloaded') ||
    lower.includes('deadline')
  ) {
    return {
      status: 503,
      message: 'Gemini is temporarily busy. Please wait a moment and click Retry.',
    };
  }

  return {
    status: 502,
    message: 'Unable to reach Gemini right now. Please try again in a moment.',
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function sleepWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, model: PRIMARY_MODEL });
  });

  app.post('/api/chat', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error:
          'Gemini API key is not configured on the server. Add GEMINI_API_KEY in Settings > Secrets (or .env.local) and try again.',
      });
      return;
    }

    const body = req.body as { messages?: unknown };
    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
      res.status(400).json({ error: 'Request must include a non-empty messages array.' });
      return;
    }

    const sanitizedMessages: ChatMessageInput[] = [];
    for (const item of body.messages) {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof (item as ChatMessageInput).content !== 'string' ||
        !['user', 'assistant', 'model'].includes((item as ChatMessageInput).role)
      ) {
        res.status(400).json({ error: 'Each message must have a valid role and string content.' });
        return;
      }
      const trimmed = (item as ChatMessageInput).content.trim();
      if (!trimmed) continue;
      sanitizedMessages.push({
        role: (item as ChatMessageInput).role,
        content: trimmed,
      });
    }

    if (sanitizedMessages.length === 0) {
      res.status(400).json({ error: 'Cannot send an empty message.' });
      return;
    }

    const contents = normalizeContents(sanitizedMessages);
    if (contents.length === 0) {
      res.status(400).json({ error: 'Conversation must include at least one user message.' });
      return;
    }

    const abortController = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort();
      }
    });

    const systemInstruction = `${SYSTEM_INSTRUCTION_BASE} ${getCurrentDateContext()}`;

    const attempts: Array<{ model: string; useLowThinking: boolean; delayAfterMs: number }> = [
      { model: PRIMARY_MODEL, useLowThinking: true, delayAfterMs: 400 },
      { model: FALLBACK_MODEL, useLowThinking: false, delayAfterMs: 900 },
      { model: FALLBACK_MODEL, useLowThinking: false, delayAfterMs: 0 },
    ];

    try {
      let activeIterator: AsyncIterator<{ text?: string }> | null = null;
      let firstTextChunk = '';
      let lastError: unknown = null;

      for (let idx = 0; idx < attempts.length; idx += 1) {
        if (abortController.signal.aborted) {
          return;
        }
        const plan = attempts[idx];
        try {
          const responseStream = await ai.models.generateContentStream({
            model: plan.model,
            contents,
            config: {
              systemInstruction,
              ...(plan.useLowThinking
                ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                : {}),
            },
          });

          const iterator = responseStream[Symbol.asyncIterator]();
          let initialText = '';

          // Pull until the first non-empty text chunk so transient stream-start errors can retry/fallback cleanly
          while (true) {
            if (abortController.signal.aborted) {
              return;
            }
            const next = await iterator.next();
            if (next.done) {
              break;
            }
            const chunkText = next.value?.text;
            if (chunkText) {
              initialText = chunkText;
              break;
            }
          }

          if (!initialText) {
            throw new Error('Empty response received from Gemini stream.');
          }

          activeIterator = iterator;
          firstTextChunk = initialText;
          break;
        } catch (err) {
          if (abortController.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
            return;
          }
          lastError = err;
          const mapped = mapErrorStatusAndMessage(err);
          const isEmptyStream =
            err instanceof Error && err.message === 'Empty response received from Gemini stream.';
          console.warn(`[/api/chat] Attempt ${idx + 1} (${plan.model}) failed (${mapped.status}):`, err);

          if ((!isRetryableStatus(mapped.status) && !isEmptyStream) || idx === attempts.length - 1) {
            throw err;
          }
          if (plan.delayAfterMs > 0) {
            await sleepWithAbort(plan.delayAfterMs, abortController.signal);
          }
        }
      }

      if (!activeIterator || !firstTextChunk) {
        throw lastError ?? new Error('Failed to start Gemini stream.');
      }

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      res.write(`data: ${JSON.stringify({ text: firstTextChunk })}\n\n`);

      while (true) {
        if (abortController.signal.aborted) {
          break;
        }
        const next = await activeIterator.next();
        if (next.done) {
          break;
        }
        const text = next.value?.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      if (!abortController.signal.aborted && !res.writableEnded) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      }
      if (!res.writableEnded) {
        res.end();
      }
    } catch (error) {
      if (abortController.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        if (!res.writableEnded) {
          res.end();
        }
        return;
      }
      console.error('[/api/chat] Gemini error:', error);
      const { status, message } = mapErrorStatusAndMessage(error);
      if (!res.headersSent) {
        res.status(status).json({ error: message });
      } else if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Shah server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

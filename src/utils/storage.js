const CONVERSATIONS_KEY = 'lumen_conversations_v1';
const ACTIVE_ID_KEY = 'lumen_active_conversation_v1';
const THEME_KEY = 'lumen_theme_v1';

export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createMessage(role, content) {
  return {
    id: generateId(),
    role,
    content,
    createdAt: Date.now(),
    editedAt: null,
  };
}

export function createConversation(title = 'New chat') {
  const now = Date.now();
  return {
    id: generateId(),
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function deriveConversationTitle(firstMessageText) {
  const cleaned = String(firstMessageText || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'New chat';
  return cleaned.length > 44 ? `${cleaned.slice(0, 44).trimEnd()}…` : cleaned;
}

export function loadConversations() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((conv) => conv && typeof conv.id === 'string' && Array.isArray(conv.messages))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

export function saveConversations(conversations) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch {
    // Ignore quota or privacy mode errors gracefully
  }
}

export function loadActiveConversationId() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id) {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_ID_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_ID_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

export function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

export function groupConversationsByDate(conversations) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - oneDayMs;
  const startOfLast7Days = startOfToday - 7 * oneDayMs;

  const groups = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  for (const conv of conversations) {
    const ts = conv.updatedAt || conv.createdAt || 0;
    if (ts >= startOfToday) {
      groups.Today.push(conv);
    } else if (ts >= startOfYesterday) {
      groups.Yesterday.push(conv);
    } else if (ts >= startOfLast7Days) {
      groups['Previous 7 Days'].push(conv);
    } else {
      groups.Older.push(conv);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

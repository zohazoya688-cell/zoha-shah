function toIsoOrNull(timestamp) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatReadableDateTime(timestamp) {
  if (!timestamp) return 'Unknown time';
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString();
  }
}

export function buildExportFilename(title, extension) {
  const datePart = new Date().toISOString().slice(0, 10);
  const slug = String(title || 'chat')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const safeSlug = slug || 'chat';
  return `shah-${safeSlug}-${datePart}.${extension}`;
}

export function formatConversationAsJson(conversation) {
  const payload = {
    app: 'Shah',
    exportedAt: new Date().toISOString(),
    conversation: {
      id: conversation.id,
      title: conversation.title || 'New chat',
      createdAt: toIsoOrNull(conversation.createdAt),
      updatedAt: toIsoOrNull(conversation.updatedAt),
      messageCount: conversation.messages.length,
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        author: msg.role === 'user' ? 'You' : 'Shah',
        content: msg.content,
        createdAt: toIsoOrNull(msg.createdAt),
        editedAt: toIsoOrNull(msg.editedAt),
      })),
    },
  };

  return JSON.stringify(payload, null, 2);
}

export function formatConversationAsText(conversation) {
  const title = conversation.title || 'New chat';
  const exportedLabel = formatReadableDateTime(Date.now());
  const divider = '='.repeat(60);
  const lines = [
    `Shah — Chat Export`,
    `Title: ${title}`,
    `Exported: ${exportedLabel}`,
    `Messages: ${conversation.messages.length}`,
    divider,
    '',
  ];

  conversation.messages.forEach((msg, index) => {
    const speaker = msg.role === 'user' ? 'You' : 'Shah';
    const time = formatReadableDateTime(msg.createdAt);
    const editedSuffix = msg.editedAt ? ' (edited)' : '';
    lines.push(`[${speaker} · ${time}${editedSuffix}]`);
    lines.push(msg.content);
    if (index < conversation.messages.length - 1) {
      lines.push('');
      lines.push('-'.repeat(40));
      lines.push('');
    }
  });

  lines.push('');
  return lines.join('\n');
}

function triggerDownload({ content, filename, mimeType }) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportConversation(conversation, format) {
  if (!conversation || !Array.isArray(conversation.messages) || conversation.messages.length === 0) {
    return false;
  }

  if (format === 'json') {
    triggerDownload({
      content: formatConversationAsJson(conversation),
      filename: buildExportFilename(conversation.title, 'json'),
      mimeType: 'application/json;charset=utf-8',
    });
    return true;
  }

  if (format === 'txt') {
    triggerDownload({
      content: formatConversationAsText(conversation),
      filename: buildExportFilename(conversation.title, 'txt'),
      mimeType: 'text/plain;charset=utf-8',
    });
    return true;
  }

  return false;
}

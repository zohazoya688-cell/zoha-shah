export async function streamChatCompletion({ messages, signal, onChunk }) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
    signal,
  });

  if (!response.ok) {
    let errorMessage = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data && typeof data.error === 'string' && data.error.trim()) {
        errorMessage = data.error;
      }
    } catch {
      // Fallback to status message if body is not JSON
    }
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error('Streaming is not supported by this browser response.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  const processLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const payloadStr = trimmed.slice(5).trim();
    if (!payloadStr) return;

    let payload;
    try {
      payload = JSON.parse(payloadStr);
    } catch {
      return;
    }

    if (payload.error) {
      throw new Error(payload.error);
    }
    if (typeof payload.text === 'string' && payload.text.length > 0) {
      fullText += payload.text;
      onChunk(fullText);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      processLine(line);
    }
  }

  if (buffer.trim()) {
    processLine(buffer);
  }

  if (!fullText) {
    throw new Error('No response was received from the assistant. Please try again.');
  }

  return fullText;
}

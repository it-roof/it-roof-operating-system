export type AiChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AiProviderConfig = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export const AI_PRESETS = [
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
  { name: 'Ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2' },
  { name: 'Custom', baseUrl: '', model: '' },
] as const;

export function maskApiKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) return '••••';
  return `${trimmed.slice(0, 3)}…${trimmed.slice(-4)}`;
}

function providerHeaders(provider: AiProviderConfig) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = provider.apiKey.trim();
  if (key) headers.Authorization = `Bearer ${key}`;

  const host = provider.baseUrl.toLowerCase();
  if (host.includes('anthropic.com') && key) {
    headers['x-api-key'] = key;
    headers['anthropic-version'] = '2023-06-01';
  }
  if (host.includes('openrouter.ai')) {
    headers['HTTP-Referer'] = 'https://pinguine-os.local';
    headers['X-Title'] = 'Pinguine OS';
  }
  return headers;
}

export async function* streamChatCompletion(
  provider: AiProviderConfig,
  messages: AiChatMessage[],
) {
  const base = provider.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: providerHeaders(provider),
    body: JSON.stringify({
      model: provider.model,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let detail = body.slice(0, 400);
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } | string };
      if (typeof parsed.error === 'string') detail = parsed.error;
      else if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      // keep raw body
    }
    throw new Error(detail || `${provider.name} hat mit ${res.status} geantwortet.`);
  }

  if (!res.body) throw new Error('Keine Antwort vom Provider.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
        };
        const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
        if (delta) yield delta;
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
}

export function titleFromMessage(content: string) {
  const compact = content.replace(/\s+/g, ' ').trim();
  if (!compact) return 'Neuer Chat';
  return compact.length > 42 ? `${compact.slice(0, 42)}…` : compact;
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeftIcon, ArrowUpIcon, TrashIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiProvider } from '@/components/ai-provider-sheet';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  providerId: string | null;
  providerName: string | null;
  messages: Message[];
};

type Props = {
  conversationId: string;
  providers: AiProvider[];
};

export function AiChatWindow({ conversationId, providers }: Props) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const enabledProviders = providers.filter((p) => p.enabled || p.id === conversation?.providerId);

  const load = useCallback(async () => {
    const r = await fetch(`/api/ai/conversations/${conversationId}`);
    if (!r.ok) {
      router.replace('/ai');
      return;
    }
    setConversation(await r.json());
    setLoading(false);
  }, [conversationId, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, streamText]);

  async function changeProvider(id: string) {
    await fetch(`/api/ai/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: id }),
    });
    setConversation((c) =>
      c
        ? {
            ...c,
            providerId: id,
            providerName: enabledProviders.find((p) => p.id === id)?.name ?? c.providerName,
          }
        : c,
    );
  }

  async function remove() {
    await fetch(`/api/ai/conversations/${conversationId}`, { method: 'DELETE' });
    router.push('/ai');
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    if (!conversation?.providerId && enabledProviders.length === 0) {
      setError('Bitte zuerst eine API andocken.');
      return;
    }

    setInput('');
    setError(null);
    setSending(true);
    setStreamText('');

    const optimistic: Message = { id: 'temp-user', role: 'user', content: text };
    setConversation((c) => (c ? { ...c, messages: [...c.messages, optimistic] } : c));

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation_id: conversationId,
        content: text,
        provider_id: conversation?.providerId ?? enabledProviders[0]?.id,
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({ error: 'Senden fehlgeschlagen.' }));
      setError(body.error ?? 'Senden fehlgeschlagen.');
      setSending(false);
      await load();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assembled = '';
    let nextTitle = conversation?.title;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() ?? '';
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;
        try {
          const json = JSON.parse(line.slice(5).trim()) as {
            delta?: string;
            done?: boolean;
            title?: string;
            error?: string;
          };
          if (json.error) {
            setError(json.error);
          }
          if (json.delta) {
            assembled += json.delta;
            setStreamText(assembled);
          }
          if (json.title) nextTitle = json.title;
        } catch {
          // ignore
        }
      }
    }

    setStreamText('');
    setSending(false);
    setConversation((c) => {
      if (!c) return c;
      const messages = c.messages.filter((m) => m.id !== 'temp-user');
      messages.push({ id: crypto.randomUUID(), role: 'user', content: text });
      if (assembled) {
        messages.push({ id: crypto.randomUUID(), role: 'assistant', content: assembled });
      }
      return { ...c, title: nextTitle ?? c.title, messages };
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const messages = conversation?.messages ?? [];

  return (
    <div className="flex-1 min-h-0 bg-background text-foreground flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/60 shrink-0">
        <div className="w-full max-w-xl md:max-w-3xl mx-auto px-2 md:px-4 h-14 flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => router.push('/ai')} aria-label="Zurück">
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            {loading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <p className="text-sm font-semibold tracking-tight truncate">{conversation?.title ?? 'Chat'}</p>
            )}
          </div>
          {enabledProviders.length > 0 && (
            <Select
              value={conversation?.providerId ?? enabledProviders[0]?.id}
              onValueChange={changeProvider}
            >
              <SelectTrigger size="sm" className="max-w-[140px] h-8">
                <SelectValue placeholder="API" />
              </SelectTrigger>
              <SelectContent>
                {enabledProviders.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Chat löschen">
            <TrashIcon className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <div className="max-w-xl md:max-w-3xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex flex-col gap-3 mt-4">
            {[70, 50, 80].map((w) => (
              <Skeleton key={w} className="h-16 rounded-2xl" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : messages.length === 0 && !streamText ? (
          <div className="pt-16 text-center">
            <p className="text-sm text-muted-foreground">Schreib etwas, um den Chat zu starten.</p>
            {enabledProviders.length === 0 && (
              <p className="text-[11px] font-mono text-muted-foreground mt-2">Noch keine API angedockt.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {streamText && <MessageBubble role="assistant" content={streamText} streaming />}
            {sending && !streamText && (
              <div className="self-start rounded-2xl bg-muted px-4 py-3">
                <span className="inline-flex gap-1">
                  <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.2s]" />
                  <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.1s]" />
                  <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
                </span>
              </div>
            )}
            {error && <p className="text-xs text-destructive font-mono px-1">{error}</p>}
            <div ref={bottomRef} />
          </div>
        )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="shrink-0 bg-background/95 backdrop-blur border-t border-border/60 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-xl md:max-w-3xl mx-auto px-3 py-2.5 flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Nachricht…"
            rows={1}
            className="min-h-10 max-h-32 resize-none py-2.5"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="size-10 rounded-full flex-shrink-0"
            disabled={sending || !input.trim()}
            aria-label="Senden"
          >
            <ArrowUpIcon className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  streaming,
}: {
  role: Message['role'];
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === 'user';
  return (
    <div className={cn('max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words', isUser ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-muted text-foreground')}>
      {content}
      {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-current/60 animate-pulse" />}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AiProviderSheet, type AiProvider } from '@/components/ai-provider-sheet';
import { PageContainer } from '@/components/page-container';
import { PlugIcon, PlusIcon, SparklesIcon } from 'lucide-react';

type Conversation = {
  id: string;
  title: string;
  providerName: string | null;
  updatedAt: string | null;
  preview: string | null;
};

export default function AiPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    const [cRes, pRes] = await Promise.all([
      fetch('/api/ai/conversations'),
      fetch('/api/ai/providers'),
    ]);
    setConversations(await cRes.json());
    setProviders(await pRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function newChat() {
    const enabled = providers.filter((p) => p.enabled);
    const r = await fetch('/api/ai/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: enabled[0]?.id ?? null }),
    });
    const { id } = await r.json();
    router.push(`/ai/${id}`);
  }

  const enabledCount = providers.filter((p) => p.enabled).length;

  return (
    <PageContainer>
        <div className="pt-8 pb-6 md:pt-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI</h1>
            <p className="text-xs font-mono text-muted-foreground mt-1 tracking-wide">
              {enabledCount === 0
                ? 'Keine API angedockt'
                : `${enabledCount} API${enabledCount === 1 ? '' : 's'} · ${conversations.length} Chats`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 text-muted-foreground hover:text-foreground"
              onClick={() => setSheetOpen(true)}
              aria-label="APIs verwalten"
            >
              <PlugIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              onClick={newChat}
              className="rounded-full size-10"
              aria-label="Neuer Chat"
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="pt-10 flex flex-col items-center text-center gap-3">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <SparklesIcon className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground max-w-[260px]">
              {enabledCount === 0
                ? 'Dock zuerst eine AI-API an — danach kannst du hier chatten.'
                : 'Noch keine Chats. Starte ein Fenster und frag los.'}
            </p>
            {enabledCount === 0 ? (
              <Button className="mt-2 h-10" onClick={() => setSheetOpen(true)}>
                API andocken
              </Button>
            ) : (
              <Button className="mt-2 h-10" onClick={newChat}>
                Neuer Chat
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => router.push(`/ai/${c.id}`)}
                className="w-full text-left py-4 flex flex-col gap-0.5 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold tracking-tight truncate">{c.title}</p>
                  <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
                    {formatWhen(c.updatedAt)}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate tracking-wide">
                  {c.providerName ? `${c.providerName} · ` : ''}
                  {c.preview?.replace(/\s+/g, ' ') || 'Leerer Chat'}
                </p>
              </button>
            ))}
          </div>
        )}

      <AiProviderSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onChanged={load}
      />
    </PageContainer>
  );
}

function formatWhen(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

'use client';

import { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AI_PRESETS } from '@/lib/ai';
import { cn } from '@/lib/utils';
import { PencilIcon, TrashIcon } from 'lucide-react';

export type AiProvider = {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  hasKey: boolean;
  apiKeyHint: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function AiProviderSheet({ open, onClose, onChanged }: Props) {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [editing, setEditing] = useState<AiProvider | 'new' | null>(null);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    fetch('/api/ai/providers')
      .then((r) => r.json())
      .then(setProviders);
  }

  useEffect(() => {
    if (open) {
      load();
      setEditing(null);
    }
  }, [open]);

  function startNew(preset: (typeof AI_PRESETS)[number] = AI_PRESETS[0]) {
    setEditing('new');
    setName(preset.name === 'Custom' ? '' : preset.name);
    setBaseUrl(preset.baseUrl);
    setModel(preset.model);
    setApiKey('');
  }

  function startEdit(p: AiProvider) {
    setEditing(p);
    setName(p.name);
    setBaseUrl(p.baseUrl);
    setModel(p.model);
    setApiKey('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim() || !model.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      base_url: baseUrl.trim(),
      model: model.trim(),
      ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
    };

    if (editing === 'new') {
      await fetch('/api/ai/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else if (editing) {
      await fetch(`/api/ai/providers/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setSaving(false);
    setEditing(null);
    load();
    onChanged();
  }

  async function toggleEnabled(p: AiProvider) {
    await fetch(`/api/ai/providers/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !p.enabled }),
    });
    load();
    onChanged();
  }

  async function remove(p: AiProvider) {
    await fetch(`/api/ai/providers/${p.id}`, { method: 'DELETE' });
    load();
    onChanged();
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-xl px-5 pb-8 overflow-y-auto">
          <DrawerHeader className="px-0 pt-4 pb-5">
            <DrawerTitle className="text-lg">
              {editing ? (editing === 'new' ? 'API andocken' : 'API bearbeiten') : 'AI-APIs'}
            </DrawerTitle>
          </DrawerHeader>

          {editing ? (
            <form onSubmit={save} className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-1.5">
                {AI_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setName(preset.name === 'Custom' ? name : preset.name);
                      setBaseUrl(preset.baseUrl || baseUrl);
                      setModel(preset.model || model);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-mono border transition-colors',
                      baseUrl === preset.baseUrl && preset.baseUrl
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="ai-name">Name</Label>
                <Input id="ai-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ai-url">Base-URL</Label>
                <Input
                  id="ai-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="h-10 font-mono text-sm"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ai-model">Modell</Label>
                <Input
                  id="ai-model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="h-10 font-mono text-sm"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="ai-key">API-Key</Label>
                <Input
                  id="ai-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={editing !== 'new' && editing.apiKeyHint ? editing.apiKeyHint : 'sk-…'}
                  autoComplete="off"
                  className="h-10 font-mono text-sm"
                  required={editing === 'new' && !baseUrl.includes('localhost')}
                />
                {editing !== 'new' && (
                  <p className="text-[11px] font-mono text-muted-foreground">Leer lassen, um den bestehenden Key zu behalten.</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setEditing(null)}>
                  Zurück
                </Button>
                <Button type="submit" className="flex-1 h-11" disabled={saving}>
                  {saving ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {providers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Noch keine API angedockt. OpenAI, Anthropic, Groq, OpenRouter, Gemini oder Ollama — alles OpenAI-kompatible Endpunkte.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-border/60">
                  {providers.map((p) => (
                    <div key={p.id} className="py-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold tracking-tight">{p.name}</p>
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">
                          {p.model}
                          {p.apiKeyHint ? ` · ${p.apiKeyHint}` : ''}
                        </p>
                      </div>
                      <Switch checked={p.enabled} onCheckedChange={() => toggleEnabled(p)} />
                      <Button variant="ghost" size="icon-sm" onClick={() => startEdit(p)} aria-label="Bearbeiten">
                        <PencilIcon className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(p)} aria-label="Löschen">
                        <TrashIcon className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <Button className="h-11" onClick={() => startNew()}>
                API andocken
              </Button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

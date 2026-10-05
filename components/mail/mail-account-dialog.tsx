'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SaveForm } from '@/components/save-form';
import type { MailboxPublic } from '@/lib/mail/types';

type Props = {
  open: boolean;
  initial?: MailboxPublic | null;
  onClose: () => void;
  onSaved: () => void;
};

export function MailAccountDialog({ open, initial, onClose, onSaved }: Props) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [username, setUsername] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPassword('');
    if (initial) {
      setEmail(initial.email);
      setDisplayName(initial.display_name ?? '');
      setImapHost(initial.imap_host);
      setImapPort(String(initial.imap_port));
      setSmtpHost(initial.smtp_host);
      setSmtpPort(String(initial.smtp_port));
      setUsername(initial.username);
      setAdvanced(true);
      return;
    }
    setEmail('');
    setDisplayName('');
    setImapHost('');
    setImapPort('993');
    setSmtpHost('');
    setSmtpPort('587');
    setUsername('');
    setAdvanced(false);
  }, [open, initial]);

  async function guess(nextEmail: string) {
    if (!nextEmail.includes('@') || initial) return;
    const r = await fetch(`/api/mail/guess?email=${encodeURIComponent(nextEmail)}`);
    const data = await r.json() as { imapHost?: string; smtpHost?: string; imapPort?: number; smtpPort?: number };
    if (data.imapHost) setImapHost(data.imapHost);
    if (data.smtpHost) setSmtpHost(data.smtpHost);
    if (data.imapPort) setImapPort(String(data.imapPort));
    if (data.smtpPort) setSmtpPort(String(data.smtpPort));
    if (!username) setUsername(nextEmail);
  }

  async function submit() {
    if (!email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        email: email.trim(),
        display_name: displayName.trim() || null,
        imap_host: imapHost.trim(),
        imap_port: Number(imapPort) || 993,
        imap_secure: true,
        smtp_host: smtpHost.trim(),
        smtp_port: Number(smtpPort) || 587,
        smtp_secure: Number(smtpPort) === 465,
        username: username.trim() || email.trim(),
        password: password || undefined,
      };
      const r = await fetch(initial ? `/api/mail/accounts/${initial.id}` : '/api/mail/accounts', {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => null) as { error?: string } | null;
      if (!r.ok) {
        setError(data?.error || 'Speichern fehlgeschlagen');
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Konto bearbeiten' : 'Konto hinzufügen'}</DialogTitle>
        </DialogHeader>
        <SaveForm onSave={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mail-email">E-Mail</Label>
            <Input
              id="mail-email"
              type="email"
              value={email}
              disabled={!!initial}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => void guess(email)}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mail-name">Anzeigename</Label>
            <Input id="mail-name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mail-pass">Passwort{initial ? ' (leer = unverändert)' : ''}</Label>
            <Input id="mail-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button
            type="button"
            className="text-left text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setAdvanced(a => !a)}
          >
            {advanced ? 'Server ausblenden' : 'Server & Ports'}
          </button>
          {advanced && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>IMAP-Host</Label>
                  <Input value={imapHost} onChange={e => setImapHost(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Port</Label>
                  <Input value={imapPort} onChange={e => setImapPort(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>SMTP-Host</Label>
                  <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Port</Label>
                  <Input value={smtpPort} onChange={e => setSmtpPort(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Benutzername</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} />
              </div>
            </>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <DialogFooter className="px-0">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving || !email.trim() || (!initial && !password)}>
              {saving ? 'Prüfen…' : 'Speichern'}
            </Button>
          </DialogFooter>
        </SaveForm>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [imapSecure, setImapSecure] = useState(true);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [username, setUsername] = useState('');
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
      setImapSecure(initial.imap_secure);
      setSmtpHost(initial.smtp_host);
      setSmtpPort(String(initial.smtp_port));
      setSmtpSecure(initial.smtp_secure);
      setUsername(initial.username);
      return;
    }
    setEmail('');
    setDisplayName('');
    setImapHost('');
    setImapPort('993');
    setImapSecure(true);
    setSmtpHost('');
    setSmtpPort('587');
    setSmtpSecure(false);
    setUsername('');
  }, [open, initial]);

  async function guess(nextEmail: string) {
    if (!nextEmail.includes('@') || initial) return;
    const r = await fetch(`/api/mail/guess?email=${encodeURIComponent(nextEmail)}`);
    const data = await r.json() as {
      imapHost?: string;
      smtpHost?: string;
      imapPort?: number;
      smtpPort?: number;
      imapSecure?: boolean;
      smtpSecure?: boolean;
    };
    if (data.imapHost) setImapHost(data.imapHost);
    if (data.smtpHost) setSmtpHost(data.smtpHost);
    if (data.imapPort) setImapPort(String(data.imapPort));
    if (data.smtpPort) setSmtpPort(String(data.smtpPort));
    if (typeof data.imapSecure === 'boolean') setImapSecure(data.imapSecure);
    if (typeof data.smtpSecure === 'boolean') setSmtpSecure(data.smtpSecure);
    setUsername(prev => prev || nextEmail);
  }

  async function submit() {
    if (!email.trim()) return;
    if (!imapHost.trim() || !smtpHost.trim()) {
      setError('IMAP- und SMTP-Host sind nötig');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const portSmtp = Number(smtpPort) || 587;
      const payload = {
        email: email.trim(),
        display_name: displayName.trim() || null,
        imap_host: imapHost.trim(),
        imap_port: Number(imapPort) || 993,
        imap_secure: imapSecure,
        smtp_host: smtpHost.trim(),
        smtp_port: portSmtp,
        smtp_secure: smtpSecure || portSmtp === 465,
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
      <DialogContent className="sm:max-w-lg">
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
            <Label htmlFor="mail-user">Benutzername</Label>
            <Input
              id="mail-user"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="meist = E-Mail"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mail-pass">Passwort{initial ? ' (leer = unverändert)' : ''}</Label>
            <Input id="mail-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="mail-imap-host">IMAP-Server</Label>
              <Input
                id="mail-imap-host"
                value={imapHost}
                onChange={e => setImapHost(e.target.value)}
                placeholder="imap.beispiel.de"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mail-imap-port">Port</Label>
              <Input id="mail-imap-port" value={imapPort} onChange={e => setImapPort(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={imapSecure} onCheckedChange={v => setImapSecure(v === true)} />
            IMAP SSL/TLS
          </label>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="mail-smtp-host">SMTP-Server</Label>
              <Input
                id="mail-smtp-host"
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
                placeholder="smtp.beispiel.de"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mail-smtp-port">Port</Label>
              <Input
                id="mail-smtp-port"
                value={smtpPort}
                onChange={e => {
                  setSmtpPort(e.target.value);
                  if (e.target.value === '465') setSmtpSecure(true);
                  if (e.target.value === '587') setSmtpSecure(false);
                }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={smtpSecure} onCheckedChange={v => setSmtpSecure(v === true)} />
            SMTP SSL (Port 465) · bei 587 meist STARTTLS ohne Haken
          </label>

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

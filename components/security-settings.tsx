'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  changePasswordAction,
  confirmTotpSetupAction,
  disableTotpAction,
  startTotpSetupAction,
  type FormMsg,
  type TotpSetupState,
} from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const empty: FormMsg = {};
const totpInitial: TotpSetupState = {};

export function SecuritySettings({ totpEnabled }: { totpEnabled: boolean }) {
  const [pwdState, pwdAction, pwdPending] = useActionState(changePasswordAction, empty);
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmTotpSetupAction,
    totpInitial,
  );
  const [disableState, disableAction, disablePending] = useActionState(disableTotpAction, empty);
  const [setup, setSetup] = useState<TotpSetupState | null>(null);
  const [pendingSetup, startSetup] = useTransition();

  const enabled = totpEnabled || !!confirmState.success;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-10 pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Sicherheit</h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Passwort und Zwei-Faktor-Authentifizierung
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-sm font-semibold">Passwort ändern</h2>
        <form action={pwdAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
            <Input id="currentPassword" name="currentPassword" type="password" className="h-10" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">Neues Passwort</Label>
            <Input id="newPassword" name="newPassword" type="password" className="h-10" minLength={12} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Bestätigen</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" className="h-10" minLength={12} required />
          </div>
          {pwdState.error && <p className="text-sm text-danger">{pwdState.error}</p>}
          {pwdState.success && <p className="text-sm text-muted-foreground">{pwdState.success}</p>}
          <Button type="submit" variant="success-solid" className="h-10 w-fit" disabled={pwdPending}>
            {pwdPending ? 'Speichern…' : 'Passwort speichern'}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-4 border-t border-border pt-8">
        <h2 className="font-heading text-sm font-semibold">Zwei-Faktor (TOTP)</h2>
        <p className="font-mono text-xs text-muted-foreground">
          Status: {enabled ? 'aktiv' : 'nicht aktiv'}
        </p>

        {!enabled && (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-fit"
              disabled={pendingSetup}
              onClick={() => {
                startSetup(async () => {
                  const res = await startTotpSetupAction();
                  setSetup(res);
                });
              }}
            >
              {pendingSetup ? 'Vorbereiten…' : '2FA einrichten'}
            </Button>

            {(setup?.qrDataUrl || setup?.error) && (
              <div className="flex flex-col gap-3">
                {setup.error && <p className="text-sm text-danger">{setup.error}</p>}
                {setup.qrDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={setup.qrDataUrl} alt="2FA QR-Code" className="size-48 border border-border bg-white p-2" />
                )}
                {setup.secret && (
                  <p className="font-mono text-xs break-all text-muted-foreground">
                    Secret: {setup.secret}
                  </p>
                )}
                <form action={confirmAction} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="totp-confirm">Code aus der App</Label>
                    <Input id="totp-confirm" name="totp" className="h-10 font-mono" maxLength={6} required />
                  </div>
                  {confirmState.error && <p className="text-sm text-danger">{confirmState.error}</p>}
                  {confirmState.success && <p className="text-sm text-muted-foreground">{confirmState.success}</p>}
                  <Button type="submit" variant="success-solid" className="h-10 w-fit" disabled={confirmPending}>
                    {confirmPending ? 'Prüfen…' : '2FA aktivieren'}
                  </Button>
                </form>
              </div>
            )}
          </>
        )}

        {enabled && (
          <form action={disableAction} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="disable-password">Passwort</Label>
              <Input id="disable-password" name="password" type="password" className="h-10" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="disable-totp">Aktueller 2FA-Code</Label>
              <Input id="disable-totp" name="totp" className="h-10 font-mono" maxLength={6} required />
            </div>
            {disableState.error && <p className="text-sm text-danger">{disableState.error}</p>}
            {disableState.success && <p className="text-sm text-muted-foreground">{disableState.success}</p>}
            <Button type="submit" variant="outline" className="h-10 w-fit" disabled={disablePending}>
              {disablePending ? '…' : '2FA deaktivieren'}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}

'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resetPasswordAction, type FormMsg } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: FormMsg = {};

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        <Link href="/login" className="underline">Zurück</Link>
      </p>
    );
  }

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4" autoComplete="off">
      <input type="hidden" name="token" value={token} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">Passwort</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className="h-10"
          minLength={12}
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Bestätigen</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-10"
          minLength={12}
          required
        />
      </div>

      {state.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-muted-foreground" role="status">
          <Link href="/login" className="underline">Weiter</Link>
        </p>
      )}

      {!state.success && (
        <Button type="submit" variant="success-solid" className="h-10" disabled={pending}>
          {pending ? '…' : 'Speichern'}
        </Button>
      )}
    </form>
  );
}

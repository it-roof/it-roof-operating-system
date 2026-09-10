'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction, type FormMsg } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initial: FormMsg = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  return (
    <form action={action} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" className="h-10" required autoFocus />
      </div>

      {state.error && (
        <p className="text-sm text-danger" role="alert">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-muted-foreground" role="status">{state.success}</p>
      )}
      {state.resetLink && process.env.NODE_ENV !== 'production' && (
        <p className="break-all text-xs text-muted-foreground">
          <a className="underline" href={state.resetLink}>{state.resetLink}</a>
        </p>
      )}

      <Button type="submit" variant="success-solid" className="h-10" disabled={pending}>
        {pending ? '…' : 'Weiter'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="underline-offset-2 hover:underline">Zurück</Link>
      </p>
    </form>
  );
}

'use client';

import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LockIcon, LogInIcon, MailIcon } from 'lucide-react';
import { loginAction, type LoginState } from '@/app/actions/auth';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';

const initial: LoginState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const [state, action, pending] = useActionState(loginAction, initial);
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (state.needs2fa) setStep('mfa');
  }, [state.needs2fa]);

  if (step === 'mfa') {
    return (
      <form action={action} className="flex w-full max-w-xs flex-col gap-4" autoComplete="off">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />

        <InputGroup className="h-10">
          <InputGroupAddon align="inline-end">
            <LogInIcon />
          </InputGroupAddon>
          <InputGroupInput
            id="totp"
            name="totp"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="h-10 font-mono tracking-widest"
            aria-label="Code"
            maxLength={6}
            required
            autoFocus
            disabled={pending}
          />
        </InputGroup>

        <button type="submit" className="sr-only" disabled={pending}>
          Weiter
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex w-full max-w-xs flex-col gap-4" autoComplete="off">
      <input type="hidden" name="next" value={next} />

      <InputGroup className="h-10">
        <InputGroupAddon align="inline-end">
          <MailIcon />
        </InputGroupAddon>
        <InputGroupInput
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          className="h-10"
          aria-label="E-Mail"
          required
          autoFocus
          disabled={pending}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </InputGroup>

      <InputGroup className="h-10">
        <InputGroupAddon align="inline-end">
          <LockIcon />
        </InputGroupAddon>
        <InputGroupInput
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-10"
          aria-label="Passwort"
          required
          disabled={pending}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </InputGroup>

      <button type="submit" className="sr-only" disabled={pending}>
        Weiter
      </button>
    </form>
  );
}

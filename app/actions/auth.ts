'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/').trim() || '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (!email || !password) {
    return { error: 'E-Mail und Passwort erforderlich.' };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: safeNext,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Anmeldung fehlgeschlagen.' };
    }
    throw error;
  }

  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
}

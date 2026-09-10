import { Suspense } from 'react';
import { LoginForm } from '@/components/login-form';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-10 items-center justify-center bg-foreground font-heading text-sm font-bold text-background">
          P
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Pinguine OS</h1>
        <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground">
          hq.it-roof.com · Anmeldung
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-48 w-full max-w-sm rounded-lg" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}

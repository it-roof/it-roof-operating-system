import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Login',
  robots: { index: false, follow: false, nocache: true },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <Suspense fallback={<Skeleton className="h-48 w-full max-w-sm rounded-lg" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AiChatWindow } from '@/components/ai-chat-window';
import type { AiProvider } from '@/components/ai-provider-sheet';
import { Skeleton } from '@/components/ui/skeleton';

export default function AiChatPage() {
  const { id } = useParams<{ id: string }>();
  const [providers, setProviders] = useState<AiProvider[] | null>(null);

  useEffect(() => {
    fetch('/api/ai/providers')
      .then((r) => r.json())
      .then(setProviders);
  }, []);

  if (!id || !providers) {
    return (
      <div className="flex-1 min-h-0 bg-background px-4 pt-8">
        <Skeleton className="h-10 w-40 mb-6" />
        <Skeleton className="h-16 w-3/4 rounded-2xl" />
      </div>
    );
  }

  return <AiChatWindow conversationId={id} providers={providers} />;
}

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { aiConversation, aiMessage, aiProvider } from '@/lib/schema';
import { asc, eq } from 'drizzle-orm';
import { streamChatCompletion, titleFromMessage, type AiChatMessage } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { conversation_id, content, provider_id } = await req.json();
  const text = typeof content === 'string' ? content.trim() : '';

  if (!conversation_id || !text) {
    return new Response(JSON.stringify({ error: 'conversation_id und content sind Pflicht.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [conversation] = await db
    .select()
    .from(aiConversation)
    .where(eq(aiConversation.id, conversation_id));

  if (!conversation) {
    return new Response(JSON.stringify({ error: 'Chat nicht gefunden.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const providerId = provider_id || conversation.providerId;
  if (!providerId) {
    return new Response(JSON.stringify({ error: 'Bitte zuerst eine API andocken und auswählen.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const [provider] = await db.select().from(aiProvider).where(eq(aiProvider.id, providerId));
  if (!provider || !provider.enabled) {
    return new Response(JSON.stringify({ error: 'Provider nicht verfügbar.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = await db
    .select({ role: aiMessage.role, content: aiMessage.content })
    .from(aiMessage)
    .where(eq(aiMessage.conversationId, conversation_id))
    .orderBy(asc(aiMessage.createdAt));

  await db.insert(aiMessage).values({
    conversationId: conversation_id,
    role: 'user',
    content: text,
  });

  const isFirst = existing.length === 0;
  const nextTitle = isFirst ? titleFromMessage(text) : conversation.title;

  await db
    .update(aiConversation)
    .set({
      providerId,
      title: nextTitle,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(aiConversation.id, conversation_id));

  const history: AiChatMessage[] = [
    ...existing.map((m) => ({ role: m.role as AiChatMessage['role'], content: m.content })),
    { role: 'user', content: text },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      let full = '';
      try {
        for await (const delta of streamChatCompletion(provider, history)) {
          full += delta;
          send({ delta });
        }

        if (full.trim()) {
          await db.insert(aiMessage).values({
            conversationId: conversation_id,
            role: 'assistant',
            content: full,
          });
        }

        send({ done: true, title: nextTitle });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
        send({ error: message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

'use client';

import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  TEMPLATE_PLACEHOLDER_TOKENS,
  placeholderToken,
} from '@/lib/leads/template';

function insertToken(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  token: string,
  onChange: (next: string) => void,
) {
  if (!el) {
    onChange(value + token);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
  onChange(next);
  const pos = start + token.length;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(pos, pos);
  });
}

function PlaceholderChips({
  onInsert,
}: {
  onInsert: (token: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TEMPLATE_PLACEHOLDER_TOKENS.map((token) => (
        <button
          key={token}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(token)}
          className="rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-1 font-mono text-[10px] font-semibold tracking-wide text-amber-950 transition-colors hover:bg-amber-500/35 dark:text-amber-50"
        >
          {token}
        </button>
      ))}
    </div>
  );
}

type Props = {
  withSubject: boolean;
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
};

export function TemplateEditorFields({
  withSubject,
  subject,
  body,
  onSubjectChange,
  onBodyChange,
}: Props) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastFocus = useRef<'subject' | 'body'>('body');

  function insert(token: string) {
    if (withSubject && lastFocus.current === 'subject') {
      insertToken(subjectRef.current, subject, token, onSubjectChange);
      return;
    }
    insertToken(bodyRef.current, body, token, onBodyChange);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="shrink-0 space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Platzhalter einfügen (z. B. {placeholderToken('firma')})
        </p>
        <PlaceholderChips onInsert={insert} />
      </div>

      {withSubject && (
        <div className="flex shrink-0 flex-col gap-1.5">
          <Label htmlFor="step-subject">Betreff</Label>
          <Input
            ref={subjectRef}
            id="step-subject"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            onFocus={() => { lastFocus.current = 'subject'; }}
            className="h-10 bg-background font-mono text-sm"
            placeholder={`z. B. Kurzfrage zu ${placeholderToken('firma')}`}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <div className="flex shrink-0 items-baseline justify-between gap-2">
          <Label htmlFor="step-body">Text</Label>
          <span className="font-mono text-[10px] text-muted-foreground">
            {body.length.toLocaleString('de')} Zeichen
          </span>
        </div>
        <div className="relative min-h-0 flex-1 basis-[240px]">
          <Textarea
            ref={bodyRef}
            id="step-body"
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            onFocus={() => { lastFocus.current = 'body'; }}
            placeholder={
              withSubject
                ? `${placeholderToken('briefanrede')} ${placeholderToken('nachname')},\n\n…`
                : `Hallo ${placeholderToken('vorname')},\n\n…`
            }
            className="absolute inset-0 size-full resize-none overflow-y-auto bg-background px-3 py-2.5 field-sizing-fixed font-mono text-sm leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}

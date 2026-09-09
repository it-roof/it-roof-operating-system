'use client';

import { cn } from '@/lib/utils';

type Props = {
  onSave: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  /**
   * Enter in Textarea:
   * - `mod` (default): Cmd/Ctrl+Enter speichert, Enter = neue Zeile
   * - `always`: Enter speichert
   */
  textareaEnter?: 'mod' | 'always';
};

/** Formular für Speichern-Popups: Enter in Inputs speichert, Submit-Button type="submit". */
export function SaveForm({
  onSave,
  children,
  className,
  textareaEnter = 'mod',
}: Props) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void onSave(e);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;

    const el = e.target as HTMLElement;
    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') return;
    if (el.isContentEditable) return;

    if (el.tagName === 'TEXTAREA') {
      const withMod = e.metaKey || e.ctrlKey;
      if (textareaEnter === 'mod' && !withMod) return;
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  }

  return (
    <form className={cn(className)} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      {children}
    </form>
  );
}

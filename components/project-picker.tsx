'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FolderPlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectColor } from '@/lib/time-entry-utils';
import { type TrackerProject } from '@/lib/types';

type Props = {
  projects: TrackerProject[];
  value: string;
  onChange: (projectId: string) => void;
  className?: string;
};

export function ProjectPicker({ projects, value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const list = projects ?? [];
  const selected = list.find(p => p.id === value);

  const grouped = useMemo(() => {
    const acc: Record<string, TrackerProject[]> = {};
    for (const p of list) {
      const k = p.firma || 'Ohne Firma';
      if (!acc[k]) acc[k] = [];
      acc[k].push(p);
    }
    return Object.entries(acc).sort(([a], [b]) => a.localeCompare(b, 'de'));
  }, [list]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-8 max-w-[14rem] justify-start gap-2 px-2 font-normal',
            !selected && 'text-primary hover:text-primary',
            className,
          )}
        >
          {selected ? (
            <>
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: projectColor(selected.id) }}
              />
              <span className="truncate">{selected.name}</span>
            </>
          ) : (
            <>
              <FolderPlusIcon className="size-3.5" />
              Projekt
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Projekt suchen…" />
          <CommandList>
            <CommandEmpty>Kein Projekt gefunden.</CommandEmpty>
            {grouped.map(([firma, ps]) => (
              <CommandGroup key={firma} heading={firma}>
                {ps.map(p => (
                  <CommandItem
                    key={p.id}
                    value={`${p.firma ?? ''} ${p.name}`}
                    data-checked={p.id === value || undefined}
                    onSelect={() => {
                      onChange(p.id);
                      setOpen(false);
                    }}
                  >
                    {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

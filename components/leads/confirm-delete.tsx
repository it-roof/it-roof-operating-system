'use client';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2Icon } from 'lucide-react';

export function ConfirmDelete({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground/40 hover:text-danger hover:bg-danger/10">
          <Trash2Icon className="size-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Löschen?</AlertDialogTitle>
          <AlertDialogDescription>{label}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction variant="danger-solid" onClick={onConfirm}>Löschen</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

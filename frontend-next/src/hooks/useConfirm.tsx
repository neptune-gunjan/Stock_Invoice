/**
 * useConfirm – a Promise-based confirm dialog backed by shadcn AlertDialog.
 *
 * Usage:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *
 *   // in your JSX:
 *   <ConfirmDialog />
 *
 *   // when you need a confirmation:
 *   const ok = await confirm({ title: 'Delete item', description: 'Are you sure?' });
 *   if (ok) { ... }
 */
import { useCallback, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Extra class names applied to the confirm button (e.g. destructive colour). */
  confirmClassName?: string;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: (value: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  // Keep a stable ref so the confirm function identity never changes.
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true, resolve });
    });
  }, []);

  const handleClose = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    setState(null);
  }, []);

  function ConfirmDialog() {
    if (!state) return null;

    return (
      <AlertDialog open={state.open} onOpenChange={(open) => { if (!open) handleClose(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            {state.description && (
              <AlertDialogDescription>{state.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              {state.cancelLabel ?? 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              className={state.confirmClassName}
              onClick={() => handleClose(true)}
            >
              {state.confirmLabel ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return { confirm, ConfirmDialog };
}


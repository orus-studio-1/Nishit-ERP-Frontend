'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface FormDialogShellProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel?: string;
  contentClassName?: string;
  formClassName?: string;
  footerClassName?: string;
  children: React.ReactNode;
}

/** Shared Dialog chrome for a "mount-only-while-open" form dialog: header, form wrapper and a
 * Cancel/Submit footer. Field content is passed as children. */
export function FormDialogShell({
  title, onClose, onSubmit, isSubmitting, submitLabel, submittingLabel = 'Saving...',
  contentClassName = 'max-w-xl', formClassName = 'mt-2 space-y-4', footerClassName = 'flex justify-end gap-2 pt-2',
  children,
}: FormDialogShellProps) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={contentClassName}>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className={formClassName}>
          {children}
          <div className={footerClassName}>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? submittingLabel : submitLabel}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

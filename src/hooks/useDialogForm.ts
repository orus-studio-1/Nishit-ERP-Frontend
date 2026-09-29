'use client';

import { useState } from 'react';
import { showApiError, showApiSuccess } from '@/lib/apiError';

interface UseDialogFormOptions {
  onSaved: (message?: string) => void;
  onClose: () => void;
}

/** Shared submit-lifecycle for a "mount-only-while-open" dialog form: tracks isSubmitting,
 * runs the request, shows the success/error toast, then calls onSaved and closes the dialog.
 * Validation stays in the caller (call this only after validation passes). */
export function useDialogForm({ onSaved, onClose }: UseDialogFormOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (action: () => Promise<{ data?: { message?: string } } | void>, fallbackMessage: string, errorMessage: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await action();
      const message = (response as { data?: { message?: string } } | undefined)?.data?.message;
      showApiSuccess(message || fallbackMessage);
      onSaved(message);
      onClose();
    } catch (err) {
      showApiError(err, errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, submit };
}

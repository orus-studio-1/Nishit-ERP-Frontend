'use client';

import { useState } from 'react';
import { Loader2, LogOut, MonitorSmartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { showApiError } from '@/lib/apiError';

type Choice = 'this' | 'all';

/** Asks whether to sign out of just this browser or of every device the user is signed in on. */
export function SignOutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { logout } = useAuth();
  const [pending, setPending] = useState<Choice | null>(null);

  const signOut = async (choice: Choice) => {
    setPending(choice);
    try {
      await logout({ allDevices: choice === 'all' });
    } catch (err) {
      showApiError(err, 'Could not sign out of all devices. Please try again.');
      setPending(null);
    }
  };

  const option = (choice: Choice, icon: React.ReactNode, title: string, description: string, tone: string) => (
    <button
      type="button"
      disabled={pending !== null}
      onClick={() => void signOut(choice)}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${tone}`}
    >
      <span className="mt-0.5 shrink-0">{pending === choice ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}</span>
      <span>
        <span className="block text-sm font-semibold text-[#1f2937]">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-[#6b7280]">{description}</span>
      </span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sign out</DialogTitle>
          <DialogDescription>Choose where you want to sign out.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {option('this', <LogOut className="h-5 w-5 text-[#1674c4]" />, 'Sign out of this device', 'Ends your session in this browser only. You stay signed in on your other devices.', 'border-[#dfe3e8] hover:border-[#2490ef] hover:bg-[#f2f8fd]')}
          {option('all', <MonitorSmartphone className="h-5 w-5 text-[#c3423f]" />, 'Sign out of all devices', 'Ends every session on all browsers, phones and computers, including this one. Use this if you signed in on a shared or lost device.', 'border-[#f3d0ce] hover:border-[#c3423f] hover:bg-[#fff6f5]')}
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="outline" disabled={pending !== null} onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

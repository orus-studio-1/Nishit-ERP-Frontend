'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, user, token, isLoading } = useAuth();
  const router = useRouter();
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!isLoading && user && token) router.replace('/dashboard');
  }, [isLoading, router, token, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await register({ ...form, email: form.email.trim().toLowerCase() });
      toast.success('Account created successfully');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Unable to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8faf9] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#2490ef] shadow-sm shadow-[#2490ef]/25"><Building2 className="h-6 w-6 text-white" /></div>
          <h1 className="text-2xl font-bold text-[#1f2937]">Create your Nishit ERP account</h1>
          <p className="mt-1 text-sm text-[#6b7280]">One account for your standalone ERP</p>
        </div>
        <Card className="border border-[#e5e2dc] bg-white shadow-[0_18px_50px_rgba(16,24,40,0.08)]">
          <CardHeader><CardTitle>Sign up</CardTitle><CardDescription>Enter your details to create an account.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label htmlFor="firstName">First name</Label><Input id="firstName" autoComplete="given-name" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} required /></div><div className="space-y-1.5"><Label htmlFor="lastName">Last name</Label><Input id="lastName" autoComplete="family-name" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} required /></div></div>
              <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} required /></div>
              <div className="space-y-1.5"><Label htmlFor="phone">Phone <span className="text-[#9ca3af]">(optional)</span></Label><Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} minLength={12} required /><p className="text-xs text-[#6b7280]">At least 12 characters with uppercase, lowercase, number, and symbol.</p></div>
              <Button type="submit" className="h-10 w-full bg-[#2490ef] font-semibold hover:bg-[#1674c4]" disabled={isSubmitting || isLoading}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : 'Create account'}</Button>
            </form>
            <p className="mt-5 text-center text-sm text-[#6b7280]">Already have an account? <Link href="/login" className="font-medium text-[#1674c4] hover:underline">Sign in</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

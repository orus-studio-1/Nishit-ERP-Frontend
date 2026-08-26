'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && token) router.replace('/dashboard');
  }, [isLoading, router, token, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await login(email.trim().toLowerCase(), password, challenge ? code : undefined, challenge || undefined);
      if (result.requiresTwoFactor && result.challenge) {
        setChallenge(result.challenge);
        toast.success('Enter the code from your authenticator app');
        return;
      }
      toast.success('Signed in successfully');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8faf9] p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#2490ef] shadow-sm shadow-[#2490ef]/25"><Building2 className="h-6 w-6 text-white" /></div>
          <h1 className="text-2xl font-bold text-[#1f2937]">Nishit ERP</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Sign in to manage your business operations</p>
        </div>
        <Card className="border border-[#e5e2dc] bg-white shadow-[0_18px_50px_rgba(16,24,40,0.08)]">
          <CardHeader><CardTitle>Welcome back</CardTitle><CardDescription>{challenge ? 'Complete two-factor verification.' : 'Enter your account credentials to continue.'}</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!challenge && <><div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus /></div><div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div></>}
              {challenge && <div className="space-y-1.5"><Label htmlFor="code">Authenticator code</Label><Input id="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required autoFocus /></div>}
              <Button type="submit" className="h-10 w-full bg-[#2490ef] font-semibold hover:bg-[#1674c4]" disabled={isSubmitting || isLoading}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</> : <>{challenge ? 'Verify code' : 'Sign in'} <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
            </form>
            <p className="mt-5 text-center text-sm text-[#6b7280]">Don&apos;t have an account? <Link href="/register" className="font-medium text-[#1674c4] hover:underline">Sign up</Link></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

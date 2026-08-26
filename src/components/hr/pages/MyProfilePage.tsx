'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showApiError, showApiSuccess } from '@/lib/apiError';

type EmployeeOption = {
  id: string;
  employeeId: string;
  salary?: number;
  user?: { firstName: string; lastName: string; email?: string };
  department?: { name: string };
  position?: { title: string };
  status?: string;
};

function fullName(employee?: EmployeeOption) {
  return `${employee?.user?.firstName || ''} ${employee?.user?.lastName || ''}`.trim() || 'Employee';
}

export function MyProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api
      .get('/hr/me')
      .then((res) => {
        setProfile(res.data?.data);
        setForm(res.data?.data || {});
      })
      .catch((err) => showApiError(err, 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.patch('/hr/me', form);
      setProfile(res.data?.data);
      showApiSuccess('Profile updated successfully');
    } catch (err: any) {
      showApiError(err, 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Your employee master, contact, emergency, and bank details"
      >
        <Button onClick={save} disabled={isSubmitting || loading}>
          {isSubmitting ? 'Saving...' : 'Save Profile'}
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? 'Loading...' : `${fullName(profile)} (${profile?.employeeId || '-'})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            'personalEmail',
            'phone',
            'address',
            'city',
            'country',
            'emergencyName',
            'emergencyPhone',
            'bankName',
            'bankAccount',
          ].map((field) => (
            <div className="space-y-1.5" key={field}>
              <Label>{field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</Label>
              <Input
                value={form?.[field] || ''}
                onChange={(e) => setForm((f: any) => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

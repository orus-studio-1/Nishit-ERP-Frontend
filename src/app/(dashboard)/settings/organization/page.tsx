'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function OrganizationSettingsPage() {
  const [company, setCompany] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [branch, setBranch] = useState({ code: '', name: '', gstin: '', isManufacturing: false });
  const [gst, setGst] = useState({ stateCode: '', gstin: '', legalName: '', isDefault: false });
  const [rule, setRule] = useState({ documentType: 'PURCHASE_ORDER', name: '', approverId: '' });
  const [quotationProfile, setQuotationProfile] = useState<any>({ name: '', legalName: '', gstin: '', address: '', city: '', state: '', country: 'India', zip: '', logo: '', signature: '', bankDetails: '', deliveryTerms: '', deliveryChargesNote: '', terms: '' });

  const load = useCallback(async () => {
    try {
      const [tenant, approvals, accessUsers] = await Promise.all([api.get('/platform/tenant'), api.get('/platform/approvals/rules'), api.get('/access/users')]);
      const loadedCompany = tenant.data?.data?.companies?.[0] || null;
      setCompany(loadedCompany);
      if (loadedCompany) setQuotationProfile({ name: loadedCompany.name || '', legalName: loadedCompany.legalName || '', gstin: loadedCompany.gstin || '', address: loadedCompany.address || '', city: loadedCompany.city || '', state: loadedCompany.state || '', country: loadedCompany.country || 'India', zip: loadedCompany.zip || '', logo: loadedCompany.logo || '', signature: loadedCompany.quotationDefaults?.signature || '', bankDetails: loadedCompany.quotationDefaults?.bankDetails || '', deliveryTerms: loadedCompany.quotationDefaults?.deliveryTerms || '', deliveryChargesNote: loadedCompany.quotationDefaults?.deliveryChargesNote || '', terms: loadedCompany.quotationDefaults?.terms || '' });
      setRules(approvals.data?.data || []);
      setUsers(accessUsers.data?.data || []);
    } catch (error) { showApiError(error, 'Could not load organization configuration'); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (path: string, body: any, message: string, reset: () => void) => {
    try { await api.post(path, body); showApiSuccess(message); reset(); await load(); } catch (error) { showApiError(error, `Could not ${message.toLowerCase()}`); }
  };

  const imageInput = (key: 'logo' | 'signature', file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) return showApiError(new Error('Use a PNG or JPEG smaller than 2 MB'));
    const reader = new FileReader(); reader.onload = () => setQuotationProfile((current: any) => ({ ...current, [key]: String(reader.result || '') })); reader.readAsDataURL(file);
  };
  const saveQuotationProfile = async () => { try { await api.put(`/platform/companies/${company.id}/quotation-profile`, quotationProfile); showApiSuccess('Quotation company profile saved'); await load(); } catch (error) { showApiError(error, 'Could not save quotation profile'); } };

  return <div className="space-y-5">
    <PageHeader title="Organization Configuration" description="Manage the standalone company branches, GST registrations and document approvals" />
    {!company && <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">The standalone company could not be loaded. Complete company initialization first.</p>}
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="xl:col-span-2"><CardHeader><CardTitle>Quotation identity and reusable defaults</CardTitle><CardDescription>Saved once and automatically copied into every new quotation. Each draft keeps an editable snapshot, so later company changes do not alter an already issued revision.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3"><div><Label>Company name</Label><Input value={quotationProfile.name} onChange={e => setQuotationProfile({ ...quotationProfile, name: e.target.value })} /></div><div><Label>Legal name</Label><Input value={quotationProfile.legalName} onChange={e => setQuotationProfile({ ...quotationProfile, legalName: e.target.value })} /></div><div><Label>GST number</Label><Input value={quotationProfile.gstin} onChange={e => setQuotationProfile({ ...quotationProfile, gstin: e.target.value.toUpperCase() })} /></div></div>
        <div className="grid gap-3 md:grid-cols-5"><div className="md:col-span-2"><Label>Address</Label><Input value={quotationProfile.address} onChange={e => setQuotationProfile({ ...quotationProfile, address: e.target.value })} /></div>{(['city','state','zip'] as const).map(key => <div key={key}><Label className="capitalize">{key}</Label><Input value={quotationProfile[key]} onChange={e => setQuotationProfile({ ...quotationProfile, [key]: e.target.value })} /></div>)}</div>
        <div className="grid gap-3 md:grid-cols-2"><div><Label>Company logo (PNG/JPEG, maximum 2 MB)</Label><Input type="file" accept="image/png,image/jpeg" onChange={e => imageInput('logo', e.target.files?.[0])} />{quotationProfile.logo && <img alt="Company logo preview" src={quotationProfile.logo} className="mt-2 h-20 max-w-56 rounded border object-contain p-2" />}</div><div><Label>Authorised signature (PNG/JPEG, maximum 2 MB)</Label><Input type="file" accept="image/png,image/jpeg" onChange={e => imageInput('signature', e.target.files?.[0])} />{quotationProfile.signature && <img alt="Signature preview" src={quotationProfile.signature} className="mt-2 h-20 max-w-56 rounded border object-contain p-2" />}</div></div>
        <div className="grid gap-3 md:grid-cols-2"><div><Label>Bank details</Label><Textarea rows={6} value={quotationProfile.bankDetails} onChange={e => setQuotationProfile({ ...quotationProfile, bankDetails: e.target.value })} placeholder={'Bank name\nBranch\nAccount holder\nAccount number\nIFSC'} /></div><div><Label>Default terms and conditions</Label><Textarea rows={6} value={quotationProfile.terms} onChange={e => setQuotationProfile({ ...quotationProfile, terms: e.target.value })} /></div></div>
        <div className="grid gap-3 md:grid-cols-2"><div><Label>Default delivery note/terms</Label><Textarea value={quotationProfile.deliveryTerms} onChange={e => setQuotationProfile({ ...quotationProfile, deliveryTerms: e.target.value })} /></div><div><Label>Default delivery charges note</Label><Textarea value={quotationProfile.deliveryChargesNote} onChange={e => setQuotationProfile({ ...quotationProfile, deliveryChargesNote: e.target.value })} placeholder="Extra plus GST" /></div></div>
        <div className="flex items-center justify-between rounded border bg-muted/30 p-3"><p className="text-sm text-muted-foreground">Quotation currency is fixed to INR.</p><Button disabled={!company || !quotationProfile.name.trim()} onClick={saveQuotationProfile}>Save quotation defaults</Button></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Branches</CardTitle><CardDescription>Branches are available in CRM scope, documents and operational reporting.</CardDescription></CardHeader><CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2"><div><Label>Code</Label><Input value={branch.code} onChange={e => setBranch({ ...branch, code: e.target.value.toUpperCase() })} /></div><div><Label>Name</Label><Input value={branch.name} onChange={e => setBranch({ ...branch, name: e.target.value })} /></div></div>
        <Input placeholder="Branch GSTIN (optional)" value={branch.gstin} onChange={e => setBranch({ ...branch, gstin: e.target.value.toUpperCase() })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={branch.isManufacturing} onChange={e => setBranch({ ...branch, isManufacturing: e.target.checked })} /> Manufacturing branch</label>
        <Button disabled={!company || !branch.code.trim() || !branch.name.trim()} onClick={() => create(`/platform/companies/${company.id}/branches`, { ...branch, gstin: branch.gstin || undefined }, 'Branch created', () => setBranch({ code: '', name: '', gstin: '', isManufacturing: false }))}>Add Branch</Button>
        <div className="space-y-2 border-t pt-3">{company?.branches?.map((item: any) => <div key={item.id} className="rounded border p-2 text-sm"><span className="font-medium">{item.code} · {item.name}</span><span className="text-muted-foreground">{item.isManufacturing ? ' · Manufacturing' : ''}{item.gstin ? ` · ${item.gstin}` : ''}</span></div>)}</div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>GST Registrations</CardTitle><CardDescription>State-wise GST registrations used in sales and purchase documents.</CardDescription></CardHeader><CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2"><div><Label>State code</Label><Input maxLength={2} value={gst.stateCode} onChange={e => setGst({ ...gst, stateCode: e.target.value.replace(/\D/g, '') })} /></div><div><Label>GSTIN</Label><Input value={gst.gstin} onChange={e => setGst({ ...gst, gstin: e.target.value.toUpperCase() })} /></div></div>
        <Input placeholder="Legal name" value={gst.legalName} onChange={e => setGst({ ...gst, legalName: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={gst.isDefault} onChange={e => setGst({ ...gst, isDefault: e.target.checked })} /> Default registration</label>
        <Button disabled={!company || gst.stateCode.length !== 2 || !gst.gstin.trim()} onClick={() => create(`/platform/companies/${company.id}/gstins`, { ...gst, legalName: gst.legalName || undefined }, 'GST registration created', () => setGst({ stateCode: '', gstin: '', legalName: '', isDefault: false }))}>Add GST Registration</Button>
        <div className="space-y-2 border-t pt-3">{company?.gstRegistrations?.map((item: any) => <div key={item.id} className="rounded border p-2 text-sm"><span className="font-medium">{item.stateCode} · {item.gstin}</span><span className="text-muted-foreground">{item.legalName ? ` · ${item.legalName}` : ''}{item.isDefault ? ' · Default' : ''}</span></div>)}</div>
      </CardContent></Card>

      <Card className="xl:col-span-2"><CardHeader><CardTitle>Approval Rules</CardTitle><CardDescription>Make approval prerequisites visible and configurable instead of relying on API calls.</CardDescription></CardHeader><CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-3"><select className="h-10 rounded-md border px-3 text-sm" value={rule.documentType} onChange={e => setRule({ ...rule, documentType: e.target.value })}>{['PURCHASE_ORDER','RFQ_VENDOR_SELECTION','SALES_CREDIT','QUOTATION'].map(value => <option key={value}>{value}</option>)}</select><Input placeholder="Rule name" value={rule.name} onChange={e => setRule({ ...rule, name: e.target.value })} /><select className="h-10 rounded-md border px-3 text-sm" value={rule.approverId} onChange={e => setRule({ ...rule, approverId: e.target.value })}><option value="">Select approver</option>{users.map(user => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} · {user.email}</option>)}</select></div>
        <Button disabled={!rule.name.trim() || !rule.approverId} onClick={() => create('/platform/approvals/rules', { documentType: rule.documentType, name: rule.name, priority: 100, conditions: {}, steps: [{ sequence: 1, approverType: 'USER', approverId: rule.approverId }] }, 'Approval rule created', () => setRule({ documentType: 'PURCHASE_ORDER', name: '', approverId: '' }))}>Add Approval Rule</Button>
        <div className="space-y-2 border-t pt-3">{rules.length ? rules.map(item => <div key={item.id} className="rounded border p-2 text-sm"><span className="font-medium">{item.name}</span><span className="text-muted-foreground"> · {item.documentType} · Priority {item.priority} · {item.isActive ? 'Active' : 'Inactive'}</span></div>) : <p className="text-sm text-muted-foreground">No approval rules. Documents will follow their no-rule workflow.</p>}</div>
      </CardContent></Card>
    </div>
  </div>;
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Mail, MessageSquare, PackageCheck, RefreshCw, Send, ShoppingCart, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { showApiError, showApiSuccess } from '@/lib/apiError';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';

type Row = Record<string, any>;
const num = (value: any) => Number(value || 0);
const when = (value?: string) => value ? new Date(value).toLocaleString('en-IN') : '\u2014';
const docFields = [['AO number','aoNo'],['Accepted order number','acceptedOrderNo'],['Accepted order date','acceptedOrderDate'],['Vendor order number','vendorOrderNo'],['Vendor order date','vendorOrderDate'],['Bill-to code','billToCode'],['Bill-to name','billToName'],['Bill-to GSTIN','billToGstin'],['Bill-to PAN','billToPan'],['Dispatch-to code','dispatchToCode'],['Dispatch-to name','dispatchToName'],['Dispatch-to GSTIN','dispatchToGstin'],['Vendor code','vendorCode'],['Contact person','contactPerson'],['Contact number','contactNo'],['Payment terms','paymentTerms'],['Documents to','documentsTo']];

export default function ProcurementCasePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Row>();
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState('');

  // Quote dialog
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quote, setQuote] = useState<Row>({ supplierId: '', date: new Date().toISOString().slice(0,10), validUntil: '', currency: 'INR', shippingAmount: 0, discount: 0, terms: '', notes: '', vendorDocumentDetails: {} });
  const [quoteLines, setQuoteLines] = useState<Row[]>([]);

  // Communication
  const [message, setMessage] = useState<Row>({ supplierId: '', channel: 'EMAIL', direction: 'OUTBOUND', kind: 'NEGOTIATION', recipient: '', subject: '', message: '', send: true });

  // Invite Supplier dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState<Row[]>([]);
  const [inviteSearch, setInviteSearch] = useState('');
  const [selectedInviteSupplierId, setSelectedInviteSupplierId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await api.get(`/procurement/rfqs/${id}/workspace`); setData(response.data?.data); }
    catch (err) { showApiError(err, 'Could not load procurement case'); }
    finally { setLoading(false); }
  }, [id]);

  const loadSuppliers = useCallback(async () => {
    try { const res = await api.get('/suppliers?limit=200'); setAllSuppliers(res.data?.data?.items || res.data?.data || []); }
    catch { /* non-critical */ }
  }, []);

  useEffect(() => { void load(); void loadSuppliers(); }, [load, loadSuppliers]);

  const run = async (key: string, request: () => Promise<any>, successMsg: string) => {
    setBusy(key);
    try { await request(); showApiSuccess(successMsg); await load(); }
    catch (err) { showApiError(err, successMsg); }
    finally { setBusy(''); }
  };

  const rfq = data?.rfq;
  const stageIndex = ['RFQ_DRAFT','AWAITING_QUOTES','QUOTATIONS','SELECTED','ORDERED','RECEIVING','COMPLETED'].indexOf(data?.stage);
  const quoteTotal = useMemo(() => quoteLines.reduce((sum, line) => sum + num(line.quantity) * num(line.rate) * (1 - num(line.discount) / 100) * (1 + num(line.taxRate) / 100), 0) + num(quote.shippingAmount) - num(quote.discount), [quoteLines, quote]);

  // Helpers
  const invitedIds = new Set((rfq?.suppliers || []).map((s: Row) => s.supplierId));
  const filteredSuppliers = allSuppliers.filter(s =>
    !invitedIds.has(s.id) &&
    (inviteSearch === '' || s.name?.toLowerCase().includes(inviteSearch.toLowerCase()) || (s.email || '').toLowerCase().includes(inviteSearch.toLowerCase()))
  );

  function openInviteDialog() {
    setSelectedInviteSupplierId('');
    setInviteEmail('');
    setInviteSearch('');
    setInviteOpen(true);
  }

  async function doInviteSupplier() {
    if (!selectedInviteSupplierId) return toast.error('Please select a supplier to invite');
    await run('invite-supplier', () => api.post(`/procurement/rfqs/${id}/invite-supplier`, { supplierId: selectedInviteSupplierId, email: inviteEmail || undefined }), 'Supplier invited successfully!');
    setInviteOpen(false);
  }

  async function removeSupplier(supplierId: string, supplierName: string) {
    if (!confirm(`Remove ${supplierName} from this RFQ?`)) return;
    await run('remove-supplier', () => api.delete(`/procurement/rfqs/${id}/suppliers/${supplierId}`), `${supplierName} removed from RFQ`);
  }

  function openQuote() {
    setQuoteLines((rfq.items || []).map((item: Row) => ({ productId: item.productId, description: item.description || item.product?.name, quantity: num(item.quantity), rate: 0, taxRate: 0, discount: 0, uom: item.uom || '', deliveryDate: item.requiredBy ? String(item.requiredBy).slice(0,10) : '', hsnCode: item.product?.hsnCode || '', make: '', categoryCode: '', quantityTolerance: '' })));
    setQuoteOpen(true);
  }

  async function createQuote() {
    if (!quote.supplierId) return toast.error('Select the supplier who sent this quotation');
    await run('create-quote', () => api.post('/procurement/supplier-quotations', { ...quote, rfqId: id, items: quoteLines }), 'Supplier quotation recorded');
    setQuoteOpen(false);
  }

  async function communicate() {
    if (!message.supplierId) return toast.error('Select a supplier');
    if (!message.message?.trim()) return toast.error('Enter the communication details');
    await run('communicate', () => api.post(`/procurement/rfqs/${id}/communications`, message), message.send ? 'Communication queued and recorded' : 'Communication recorded');
    setMessage(cur => ({ ...cur, subject: '', message: '' }));
  }

  if (loading && !data) return <div className="grid min-h-[55vh] place-items-center text-sm text-gray-500"><RefreshCw className="mb-2 h-6 w-6 animate-spin" />Loading procurement case\u2026</div>;
  if (!rfq) return <div className="p-10 text-center">Procurement case not found.</div>;

  return (
    <div className="space-y-5 pb-10">
      {/* ---- Header ---- */}
      <section className="rounded-xl border bg-gradient-to-br from-white to-emerald-50/60 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Button asChild variant="ghost" size="sm" className="-ml-2"><Link href="/procurement/rfqs"><ArrowLeft className="mr-1 h-4 w-4" />Procurement cases</Link></Button>
            <div className="mt-2 flex items-center gap-3"><h1 className="font-mono text-2xl font-bold">{rfq.rfqNo}</h1><StatusBadge status={data.stage} /></div>
            <p className="mt-1 text-sm text-gray-500">{rfq.materialRequest?.requestNo ? `Demand ${rfq.materialRequest.requestNo}` : 'Direct procurement'} \u00b7 created {formatDate(rfq.transactionDate)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
            {rfq.status === 'DRAFT' && <Button disabled={!!busy} onClick={() => run('submit', () => api.post(`/procurement/rfqs/${id}/submit`), 'RFQ submitted')}><CheckCircle2 className="mr-2 h-4 w-4" />Submit RFQ</Button>}
            <Button onClick={openQuote}><FileText className="mr-2 h-4 w-4" />Record supplier quotation</Button>
          </div>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-7">
          {['RFQ','SENT','QUOTATIONS','SELECTED','ORDERED','RECEIVING','COMPLETED'].map((label,index) => (
            <div key={label} className={`rounded-lg border px-2 py-2 text-center text-[11px] font-semibold ${index <= stageIndex ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-white text-gray-400'}`}>{index + 1}. {label}</div>
          ))}
        </div>
      </section>

      {/* ---- Metrics ---- */}
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Suppliers invited" value={rfq.suppliers.length} icon={Mail} />
        <Metric label="Quotation versions" value={data.quotes.length} icon={FileText} />
        <Metric label="Purchase orders" value={data.orders.length} icon={ShoppingCart} />
        <Metric label="Vendor still owes" value={data.totals.remaining} icon={PackageCheck} />
      </div>

      {/* ---- Tabs ---- */}
      <Tabs defaultValue="overview">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="quotes">Supplier quotations ({data.quotes.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders &amp; receipts</TabsTrigger>
          <TabsTrigger value="communications">Communications ({data.communications.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit history</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <Card>
            <CardHeader><CardTitle>Requested material</CardTitle><CardDescription>The permanent source requirement for this buying case.</CardDescription></CardHeader>
            <CardContent className="p-0"><Items rows={rfq.items} /></CardContent>
          </Card>

          {/* Invited Suppliers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Invited suppliers</CardTitle>
                {(rfq.status === 'DRAFT' || rfq.status === 'SENT') && (
                  <Button size="sm" variant="outline" onClick={openInviteDialog} disabled={busy === 'invite-supplier'}>
                    <UserPlus className="mr-1.5 h-4 w-4" />Invite supplier
                  </Button>
                )}
              </div>
              {rfq.suppliers.length === 0 && (
                <p className="mt-1 flex items-center gap-1 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  Add at least one supplier before submitting the RFQ
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {rfq.suppliers.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                  <UserPlus className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                  <p>No suppliers invited yet</p>
                  <p className="mt-1 text-xs">Click &ldquo;Invite supplier&rdquo; to add suppliers to this RFQ</p>
                </div>
              ) : (
                rfq.suppliers.map((row: Row) => (
                  <div key={row.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium">{row.supplier.name}</p>
                      <p className="text-xs text-gray-500">{row.email || row.supplier.email || 'No email on record'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={row.status} />
                      {(row.status === 'PENDING' || row.status === 'INVITED') && rfq.status === 'DRAFT' && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeSupplier(row.id, row.supplier.name)} disabled={busy === 'remove-supplier'}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotations */}
        <TabsContent value="quotes" className="mt-4 space-y-4">
          {data.quotes.map((row: Row) => (
            <Card key={row.id} className={row.status === 'SELECTED' ? 'border-emerald-300' : ''}>
              <CardHeader>
                <div className="flex flex-wrap justify-between gap-3">
                  <div><CardTitle>{row.supplier.name} \u00b7 Revision {row.revisionNo}</CardTitle><CardDescription>{row.quotationNo} \u00b7 received {formatDate(row.date)}</CardDescription></div>
                  <div className="text-right"><StatusBadge status={row.status} /><p className="mt-1 font-semibold">{formatCurrency(num(row.total), 'INR')}</p></div>
                </div>
              </CardHeader>
              <CardContent><Items rows={row.items} quoted /></CardContent>
            </Card>
          ))}
          {!data.quotes.length && <Empty text='No supplier quotations recorded yet. Use "Record supplier quotation" to add one.' />}
        </TabsContent>

        {/* Orders & Receipts */}
        <TabsContent value="orders" className="mt-4 space-y-4">
          {data.orders.map((row: Row) => (
            <Card key={row.id}>
              <CardHeader>
                <div className="flex justify-between">
                  <div><CardTitle className="font-mono">{row.orderNo}</CardTitle><CardDescription>{row.supplier?.name} \u00b7 {formatDate(row.date)}</CardDescription></div>
                  <StatusBadge status={row.status} />
                </div>
              </CardHeader>
              <CardContent><Button asChild size="sm" variant="outline"><Link href={`/procurement/purchase-orders/${row.id}`}>Open workspace</Link></Button></CardContent>
            </Card>
          ))}
          {!data.orders.length && <Empty text="No purchase orders generated yet." />}
        </TabsContent>

        {/* Communications */}
        <TabsContent value="communications" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle>Send / log communication</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <Field label="Supplier"><Select value={message.supplierId} onValueChange={v => setMessage({...message, supplierId: v})}><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent>{rfq.suppliers.map((row: Row) => <SelectItem key={row.supplierId} value={row.supplierId}>{row.supplier.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Channel"><Select value={message.channel} onValueChange={v => setMessage({...message, channel: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EMAIL">Email</SelectItem><SelectItem value="PHONE">Phone</SelectItem><SelectItem value="IN_PERSON">In-person</SelectItem></SelectContent></Select></Field>
              <Field label="Subject"><Input value={message.subject} onChange={e => setMessage({...message, subject: e.target.value})} placeholder="Re: RFQ \u2026" /></Field>
              <Field label="Direction"><Select value={message.direction} onValueChange={v => setMessage({...message, direction: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OUTBOUND">Outbound (we sent)</SelectItem><SelectItem value="INBOUND">Inbound (they sent)</SelectItem></SelectContent></Select></Field>
              <div className="md:col-span-2"><Field label="Message"><Textarea rows={3} value={message.message} onChange={e => setMessage({...message, message: e.target.value})} placeholder="Type the communication content\u2026" /></Field></div>
              <div className="md:col-span-2 flex justify-end"><Button disabled={busy === 'communicate'} onClick={communicate}><Send className="mr-2 h-4 w-4" />Log communication</Button></div>
            </CardContent>
          </Card>
          <Timeline rows={data.communications} />
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Immutable procurement history</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.auditHistory.map((row: Row) => (
                <div className="grid gap-2 rounded border p-3 text-sm sm:grid-cols-[200px_1fr_auto]" key={row.id}>
                  <div><b>{row.action.replaceAll('_',' ')}</b><p className="text-xs text-gray-500">{row.entityType}</p></div>
                  <p className="text-gray-600">{row.message||JSON.stringify(row.after||{})}</p>
                  <time className="text-xs text-gray-500">{when(row.createdAt)}</time>
                </div>
              ))}
              {!data.auditHistory.length && <p className="text-sm text-gray-500">No business events recorded yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---- Record Quotation Dialog ---- */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="max-w-6xl"><DialogHeader><DialogTitle>Record supplier quotation</DialogTitle></DialogHeader>
          <div className="max-h-[78vh] space-y-5 overflow-y-auto pr-2">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Supplier *"><Select value={quote.supplierId} onValueChange={supplierId=>setQuote({...quote,supplierId})}><SelectTrigger><SelectValue placeholder="Supplier who quoted" /></SelectTrigger><SelectContent searchable searchPlaceholder="Search suppliers\u2026">{rfq.suppliers.map((row:Row)=><SelectItem key={row.supplierId} value={row.supplierId}>{row.supplier.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Quotation date"><Input type="date" value={quote.date} onChange={e=>setQuote({...quote,date:e.target.value})}/></Field>
              <Field label="Valid until"><Input type="date" value={quote.validUntil} onChange={e=>setQuote({...quote,validUntil:e.target.value})}/></Field>
              <Field label="Currency"><Input value="INR" disabled /></Field>
              {docFields.map(([label,key])=><Field label={label} key={key}><Input value={quote.vendorDocumentDetails[key]||''} onChange={e=>setQuote({...quote,vendorDocumentDetails:{...quote.vendorDocumentDetails,[key]:e.target.value}})}/></Field>)}
              <div className="md:col-span-2"><Field label="Bill-to address"><Textarea value={quote.vendorDocumentDetails.billToAddress||''} onChange={e=>setQuote({...quote,vendorDocumentDetails:{...quote.vendorDocumentDetails,billToAddress:e.target.value}})}/></Field></div>
              <div className="md:col-span-2"><Field label="Dispatch-to address"><Textarea value={quote.vendorDocumentDetails.dispatchToAddress||''} onChange={e=>setQuote({...quote,vendorDocumentDetails:{...quote.vendorDocumentDetails,dispatchToAddress:e.target.value}})}/></Field></div>
            </div>
            <div className="space-y-3">
              {quoteLines.map((line,index)=>(
                <div className="rounded border p-3" key={line.productId}>
                  <p className="mb-2 font-medium">{rfq.items.find((item:Row)=>item.productId===line.productId)?.product.name}</p>
                  <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
                    {[['Quantity','quantity','number'],['Rate','rate','number'],['Tax %','taxRate','number'],['Discount %','discount','number'],['HSN','hsnCode','text'],['Make','make','text'],['Tolerance','quantityTolerance','text'],['Delivery','deliveryDate','date']].map(([label,key,type])=>(
                      <Field label={label} key={key}><Input type={type} value={line[key]??''} onChange={e=>setQuoteLines(cur=>cur.map((row,i)=>i===index?{...row,[key]:type==='number'?num(e.target.value):e.target.value}:row))}/></Field>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label="Freight / delivery charge"><Input type="number" value={quote.shippingAmount} onChange={e=>setQuote({...quote,shippingAmount:num(e.target.value)})}/></Field>
              <Field label="Overall discount"><Input type="number" value={quote.discount} onChange={e=>setQuote({...quote,discount:num(e.target.value)})}/></Field>
              <Field label="Terms"><Input value={quote.terms} onChange={e=>setQuote({...quote,terms:e.target.value})}/></Field>
              <div className="rounded bg-gray-50 p-3 text-right"><p className="text-xs text-gray-500">Quotation total</p><p className="text-lg font-semibold">{formatCurrency(quoteTotal,'INR')}</p></div>
            </div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={()=>setQuoteOpen(false)}>Cancel</Button><Button disabled={busy==='create-quote'} onClick={createQuote}>Save supplier quotation</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Invite Supplier Dialog ---- */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-emerald-600" />Invite Supplier to RFQ</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Field label="Search supplier by name or email">
              <Input placeholder="Type to search\u2026" value={inviteSearch} onChange={e => { setInviteSearch(e.target.value); setSelectedInviteSupplierId(''); setInviteEmail(''); }} autoFocus />
            </Field>

            {inviteSearch.length >= 1 && (
              <div className="max-h-52 overflow-y-auto rounded-lg border divide-y">
                {filteredSuppliers.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400 text-center">No suppliers found</p>
                ) : (
                  filteredSuppliers.slice(0, 10).map(s => (
                    <button key={s.id} className={`w-full p-3 text-left hover:bg-emerald-50 transition-colors ${selectedInviteSupplierId === s.id ? 'bg-emerald-50 border-l-2 border-emerald-500' : ''}`}
                      onClick={() => { setSelectedInviteSupplierId(s.id); setInviteEmail(s.email || ''); setInviteSearch(s.name); }}>
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.email || 'No email on file'}</p>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedInviteSupplierId && (
              <Field label="Email to send RFQ (optional override)">
                <Input type="email" placeholder="supplier@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                <p className="mt-1 text-xs text-gray-400">Leave blank to use the supplier&apos;s registered email</p>
              </Field>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button disabled={!selectedInviteSupplierId || busy === 'invite-supplier'} onClick={doInviteSupplier} className="bg-emerald-600 hover:bg-emerald-700">
                <UserPlus className="mr-2 h-4 w-4" />{busy === 'invite-supplier' ? 'Inviting\u2026' : 'Invite supplier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({label,value,icon:Icon}:Row){return <Card><CardContent className="flex gap-3 pt-5"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><Icon className="h-5 w-5"/></span><div><p className="text-xs uppercase text-gray-500">{label}</p><p className="text-xl font-semibold">{value}</p></div></CardContent></Card>}
function Items({rows,quoted=false}:{rows:Row[],quoted?:boolean}){return <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="border-y bg-gray-50"><tr><th className="p-3 text-left">Product</th><th className="p-3 text-right">Quantity</th>{quoted&&<><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Tax</th><th className="p-3">Delivery</th></>}</tr></thead><tbody>{rows.map(row=><tr className="border-b" key={row.id||row.productId}><td className="p-3"><b>{row.product?.name}</b><p className="text-xs text-gray-500">{row.product?.sku} \u00b7 {row.description}</p></td><td className="p-3 text-right">{num(row.quantity)} {row.uom}</td>{quoted&&<><td className="p-3 text-right">{formatCurrency(num(row.rate),'INR')}</td><td className="p-3 text-right">{num(row.taxRate)}%</td><td className="p-3">{row.deliveryDate?formatDate(row.deliveryDate):'\u2014'}</td></>}</tr>)}</tbody></table></div>}
function Timeline({rows}:{rows:Row[]}){return <Card><CardHeader><CardTitle>Complete communication timeline</CardTitle><CardDescription>Inbound and outbound conversations across RFQ, quotation and purchase orders.</CardDescription></CardHeader><CardContent className="space-y-3">{rows.map(row=><div className="flex gap-3 border-b pb-3" key={row.id}><span className="rounded-full bg-blue-50 p-2">{row.channel==='EMAIL'?<Mail className="h-4 w-4 text-blue-600"/>:<MessageSquare className="h-4 w-4 text-blue-600"/>}</span><div className="flex-1"><div className="flex justify-between gap-2"><b>{row.kind?.replaceAll('_',' ')} \u00b7 {row.direction}</b><StatusBadge status={row.status||'LOGGED'}/></div><p className="text-xs text-gray-500">{row.recipient||row.subject||row.channel} \u00b7 {when(row.sentAt)}</p><p className="mt-1 whitespace-pre-wrap text-sm">{row.message}</p>{row.failureReason&&<p className="text-xs text-red-600">{row.failureReason}</p>}</div></div>)}{!rows.length&&<p className="text-sm text-gray-500">No communication recorded.</p>}</CardContent></Card>}
function Field({label,children}:Row){return <div className="space-y-1"><Label>{label}</Label>{children}</div>}
function Empty({text}:{text:string}){return <Card><CardContent className="py-12 text-center text-sm text-gray-500">{text}</CardContent></Card>}

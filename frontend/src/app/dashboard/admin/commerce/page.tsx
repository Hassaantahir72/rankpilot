'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';

type Section = 'summary' | 'orders' | 'transactions' | 'events';
const panel: React.CSSProperties = { background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 18 };
const muted: React.CSSProperties = { color: 'rgba(255,255,255,.48)', fontSize: 12 };
const cell: React.CSSProperties = { padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,.06)', textAlign: 'left', fontSize: 12, verticalAlign: 'top' };

function money(minor: unknown, currency: unknown) {
  const amount = Number(minor);
  const code = String(currency || 'USD').toUpperCase();
  if (!Number.isFinite(amount)) return '—';
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount / 100); }
  catch { return (amount / 100).toFixed(2) + ' ' + code; }
}
function date(value: unknown) {
  if (!value) return '—';
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}
function Status({ value }: { value: unknown }) {
  const s = String(value || 'unknown');
  const color = ['paid','succeeded','processed'].includes(s) ? '#4ade80' : ['failed','disputed'].includes(s) ? '#f87171' : '#fbbf24';
  return <span style={{ color, background: color + '18', border: '1px solid ' + color + '40', borderRadius: 20, padding: '3px 8px', fontSize: 11 }}>{s}</span>;
}

export default function AdminCommercePage() {
  const [section, setSection] = useState<Section>('summary');
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setBusy(true);
    setError('');
    try {
      if (section === 'summary') {
        const [s, o, t, e] = await Promise.all([
          adminApi.getCommerceSummary(), adminApi.getOrders({ limit: 25 }),
          adminApi.getTransactions({ limit: 25 }), adminApi.getProviderEvents({ limit: 25 }),
        ]);
        setSummary(s.data); setOrders(o.data.orders || []); setTransactions(t.data.transactions || []); setEvents(e.data.events || []);
      } else if (section === 'orders') {
        const r = await adminApi.getOrders({ limit: 100 }); setOrders(r.data.orders || []);
      } else if (section === 'transactions') {
        const r = await adminApi.getTransactions({ limit: 100 }); setTransactions(r.data.transactions || []);
      } else {
        const r = await adminApi.getProviderEvents({ limit: 100 }); setEvents(r.data.events || []);
      }
      setUpdated(new Date());
    } catch (e: any) {
      const code = e?.response?.data?.code;
      setError(code === 'LEDGER_MIGRATION_REQUIRED'
        ? 'The commerce ledger database migration has not been installed on this backend yet. No data has been changed. Ask the project owner to verify the production database target and apply the migration safely.'
        : e?.response?.data?.error || 'Could not load commerce data. Check the backend connection and owner-admin access.');
    } finally { setBusy(false); }
  }, [section]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const tabs: { id: Section; label: string }[] = [
    { id: 'summary', label: 'Summary' }, { id: 'orders', label: 'Orders' },
    { id: 'transactions', label: 'Transactions' }, { id: 'events', label: 'Provider events' },
  ];

  return <div style={{ color: '#fff', maxWidth: 1440, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
      <div><Link href="/dashboard/admin" style={{ color: '#a5b4fc', fontSize: 12, textDecoration: 'none' }}>← Admin panel</Link>
        <h1 style={{ fontSize: 25, fontWeight: 800, marginTop: 8 }}>Commerce operations</h1>
        <p style={muted}>Owner-only view of orders, payment transactions and webhook processing.</p></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={muted}>{updated ? 'Updated ' + updated.toLocaleTimeString() : 'Not yet refreshed'}</span>
        <button onClick={() => load()} disabled={busy} style={{ border: 0, borderRadius: 9, padding: '9px 14px', background: '#6366f1', color: '#fff', cursor: 'pointer' }}>{busy ? 'Loading…' : '↻ Refresh'}</button></div>
    </div>
    {error && <div role="alert" style={{ ...panel, borderColor: 'rgba(248,113,113,.4)', color: '#fca5a5', marginBottom: 16 }}>{error}</div>}
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
      {tabs.map(t => <button key={t.id} onClick={() => setSection(t.id)} style={{ border: '1px solid rgba(255,255,255,.1)', borderRadius: 9, padding: '9px 13px', background: section === t.id ? 'rgba(99,102,241,.2)' : 'rgba(255,255,255,.03)', color: section === t.id ? '#c7d2fe' : '#aaa', cursor: 'pointer' }}>{t.label}</button>)}
    </div>

    {section === 'summary' && summary && <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 18 }}>
        {[
          ['Orders', summary.orders?.total ?? '—'], ['Paid orders', summary.orders?.paid ?? '—'],
          ['Pending orders', summary.orders?.pending ?? '—'], ['Failed orders', summary.orders?.failed ?? '—'],
          ['Transactions', summary.transactions?.total ?? '—'], ['Failed transactions', summary.failedTransactions ?? '—'],
          ['Payment volume', money(summary.revenueMinor, 'USD')], ['Refund volume', money(summary.refundsMinor, 'USD')],
          ['Webhook events (24h)', summary.providerEvents24h ?? '—'],
        ].map(([label, value]) => <div key={String(label)} style={panel}><div style={{ fontSize: 23, fontWeight: 800 }}>{value}</div><div style={muted}>{label}</div></div>)}
      </div>
      <div style={{ ...panel, ...muted, marginBottom: 18 }}>{summary.currencyNote || 'Amounts are stored in original transaction currencies. Do not aggregate different currencies without conversion. Payment volume and refund volume above are displayed as raw minor units interpreted as USD until provider currency aggregation is added.'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
        <div style={panel}><h2 style={{ fontWeight: 700, marginBottom: 12 }}>Latest orders</h2><Rows rows={orders.slice(0, 8)} kind="orders" /></div>
        <div style={panel}><h2 style={{ fontWeight: 700, marginBottom: 12 }}>Latest transactions</h2><Rows rows={transactions.slice(0, 8)} kind="transactions" /></div>
      </div>
    </>}
    {section === 'orders' && <div style={panel}><h2 style={{ fontWeight: 700, marginBottom: 12 }}>Orders</h2><Rows rows={orders} kind="orders" /></div>}
    {section === 'transactions' && <div style={panel}><h2 style={{ fontWeight: 700, marginBottom: 12 }}>Payment transactions</h2><Rows rows={transactions} kind="transactions" /></div>}
    {section === 'events' && <div style={panel}><h2 style={{ fontWeight: 700, marginBottom: 12 }}>Provider webhook inbox</h2>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Provider','Event ID','Event type','Status','Error','Received','Processed'].map(x => <th key={x} style={cell}>{x}</th>)}</tr></thead><tbody>
        {events.map((e:any) => <tr key={e.id}><td style={cell}>{e.provider}</td><td style={cell}>{e.provider_event_id}</td><td style={cell}>{e.event_type}</td><td style={cell}><Status value={e.status}/></td><td style={cell}>{e.error || '—'}</td><td style={cell}>{date(e.received_at)}</td><td style={cell}>{date(e.processed_at)}</td></tr>)}
        {!events.length && <tr><td style={cell} colSpan={7}>No provider events recorded.</td></tr>}</tbody></table></div>
      </div>}
  </div>;
}

function Rows({ rows, kind }: { rows: any[]; kind: 'orders' | 'transactions' }) {
  const columns = kind === 'orders' ? ['Date','Customer','Provider / plan','Amount','Status'] : ['Date','Customer','Provider / type','Amount','Status'];
  return <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{columns.map(c => <th key={c} style={cell}>{c}</th>)}</tr></thead><tbody>
    {rows.map((r:any) => <tr key={r.id}><td style={cell}>{date(kind === 'orders' ? r.created_at : r.occurred_at)}</td><td style={cell}>{r.user_name || r.user_email || r.user_id || '—'}</td><td style={cell}>{r.provider} · {kind === 'orders' ? (r.plan || r.description || 'Order') : r.type}</td><td style={cell}>{money(kind === 'orders' ? r.total_minor : r.amount_minor, r.currency)}</td><td style={cell}><Status value={r.status}/></td></tr>)}
    {!rows.length && <tr><td style={cell} colSpan={5}>No records found.</td></tr>}</tbody></table></div>;
}

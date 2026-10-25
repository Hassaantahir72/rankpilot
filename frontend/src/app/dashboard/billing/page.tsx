'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { billingApi } from '@/lib/api';
import { UsageBar } from '@/components/dashboard/PlanGate';

const PLANS = [
  { id:'free',    name:'Free',    price:0,   desc:'Get started',              color:'#6b7280', priceId: '' },
  { id:'starter', name:'Starter', price:99,  desc:'For single businesses',    color:'#6366f1', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || 'price_starter' },
  { id:'growth',  name:'Growth',  price:299, desc:'For growing teams',        color:'#8b5cf6', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH || 'price_growth' },
  { id:'pro',     name:'Pro',     price:499, desc:'For power marketers',      color:'#ec4899', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_pro' },
  { id:'agency',  name:'Agency',  price:999, desc:'For agencies',             color:'#f59e0b', priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || 'price_agency' },
];

const FEATURES: Record<string, { free: string; starter: string; growth: string; pro: string; agency: string }> = {
  'Websites':         { free:'1', starter:'1', growth:'3', pro:'10', agency:'Unlimited' },
  'Audits / month':   { free:'1', starter:'10', growth:'30', pro:'100', agency:'Unlimited' },
  'AI content / mo':  { free:'2', starter:'20', growth:'60', pro:'200', agency:'Unlimited' },
  'Google Ads':       { free:'—', starter:'—', growth:'✓', pro:'✓', agency:'✓' },
  'Meta Ads':         { free:'—', starter:'—', growth:'—', pro:'✓', agency:'✓' },
  'Social posts/mo':  { free:'—', starter:'—', growth:'20', pro:'Unlimited', agency:'Unlimited' },
  'Competitor analysis': { free:'—', starter:'✓', growth:'✓', pro:'✓', agency:'✓' },
  'Weekly reports':   { free:'—', starter:'—', growth:'✓', pro:'✓', agency:'✓' },
  'White-label':      { free:'—', starter:'—', growth:'—', pro:'—', agency:'✓' },
  'API access':       { free:'—', starter:'—', growth:'—', pro:'—', agency:'✓' },
};

export default function BillingPage() {
  const { user, limits, refreshUser, trialDaysLeft, isPaid } = useAuth();
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    // Load usage from localStorage or API
    const stored = localStorage.getItem('rp_usage');
    if (stored) setUsage(JSON.parse(stored));
  }, []);

  const upgrade = async (priceId: string) => {
    if (!priceId || priceId.startsWith('price_s') || priceId.startsWith('price_g') || priceId.startsWith('price_p') || priceId.startsWith('price_a')) {
      setMsg('⚠️ Stripe not configured yet. Add your Stripe price IDs to .env.local and restart.');
      return;
    }
    setLoading(priceId);
    try {
      const { data } = await billingApi.createCheckout(priceId);
      window.location.href = data.url;
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'Failed to open checkout.');
    }
    setLoading('');
  };

  const openPortal = async () => {
    setLoading('portal');
    try {
      const { data } = await billingApi.openPortal();
      window.location.href = data.url;
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'No active subscription found.');
    }
    setLoading('');
  };

  const currentPlanIdx = PLANS.findIndex(p => p.id === user?.plan);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Billing & Plans</h1>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 28, fontSize: 14 }}>Manage your subscription, view usage, and upgrade your plan.</p>

      {msg && <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, fontSize: 14, color: '#a5b4fc' }}>{msg}<button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button></div>}

      {/* Current plan card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Current plan</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: PLANS.find(p => p.id === user?.plan)?.color || '#6366f1', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
              {user?.plan?.charAt(0).toUpperCase()}{user?.plan?.slice(1)}
            </div>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, fontWeight: 600, background: user?.subscription_status === 'active' ? 'rgba(74,222,128,0.12)' : user?.subscription_status === 'trial' ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.06)', color: user?.subscription_status === 'active' ? '#4ade80' : user?.subscription_status === 'trial' ? '#fbbf24' : 'rgba(255,255,255,0.5)' }}>
              {user?.subscription_status}
            </span>
          </div>
          {user?.plan === 'trial' && trialDaysLeft !== null && (
            <p style={{ fontSize: 13, color: trialDaysLeft <= 3 ? '#f87171' : '#fbbf24', marginBottom: 12 }}>⏰ {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining in trial</p>
          )}
          {isPaid && (
            <button onClick={openPortal} disabled={!!loading} style={{ fontSize: 13, padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {loading === 'portal' ? 'Opening...' : 'Manage subscription →'}
            </button>
          )}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>This month's usage</p>
          {limits && <>
            <UsageBar label="Audits" used={usage?.audit || 0} max={limits.max_audits_per_month === 999 ? 9999 : limits.max_audits_per_month} />
            <UsageBar label="AI Content" used={usage?.content || 0} max={limits.max_content_per_month === 9999 ? 9999 : limits.max_content_per_month} color="#8b5cf6" />
            <UsageBar label="Websites" used={usage?.websites || 0} max={limits.max_websites === 9999 ? 9999 : limits.max_websites} color="#ec4899" />
          </>}
        </div>
      </div>

      {/* Plans grid */}
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Available plans</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 36 }}>
        {PLANS.filter(p => p.id !== 'free').map((plan, i) => {
          const isCurrent = plan.id === user?.plan;
          const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < currentPlanIdx;
          return (
            <div key={plan.id} style={{ background: isCurrent ? `${plan.color}12` : 'rgba(255,255,255,0.02)', border: `1px solid ${isCurrent ? plan.color + '40' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '20px 16px', position: 'relative' }}>
              {isCurrent && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 12px', borderRadius: 100, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>CURRENT</div>}
              <p style={{ fontSize: 11, fontWeight: 700, color: plan.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{plan.name}</p>
              <p style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 4 }}>${plan.price}<span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/mo</span></p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 16 }}>{plan.desc}</p>
              {!isCurrent && (
                <button onClick={() => upgrade(plan.priceId)} disabled={!!loading} style={{ width: '100%', padding: '9px', background: isDowngrade ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${plan.color},${plan.color}cc)`, border: isDowngrade ? '1px solid rgba(255,255,255,0.1)' : 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: isDowngrade ? 'none' : `0 4px 16px ${plan.color}35` }}>
                  {loading === plan.priceId ? 'Redirecting...' : isDowngrade ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Feature comparison */}
      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Feature comparison</h2>
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ textAlign: 'left', padding: '12px 16px', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Feature</th>
              {PLANS.map(p => (
                <th key={p.id} style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 700, color: p.id === user?.plan ? '#818cf8' : 'rgba(255,255,255,0.55)', fontSize: 12 }}>{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(FEATURES).map(([feature, vals], i) => (
              <tr key={feature} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                <td style={{ padding: '11px 16px', color: 'rgba(255,255,255,0.6)' }}>{feature}</td>
                {(['free','starter','growth','pro','agency'] as const).map(k => (
                  <td key={k} style={{ padding: '11px 14px', textAlign: 'center', color: vals[k] === '✓' ? '#4ade80' : vals[k] === '—' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.65)', fontWeight: vals[k] === '✓' ? 700 : 400 }}>
                    {k === user?.plan ? <strong style={{ color: '#fff' }}>{vals[k]}</strong> : vals[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>All paid plans include 14-day free trial · Secure payments via Stripe · Cancel any time</p>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { billingApi, dashboardApi, paymentMethodsApi } from '@/lib/api';
import { UsageBar } from '@/components/dashboard/PlanGate';
import AvailablePaymentMethods from '@/components/billing/AvailablePaymentMethods';

const PLANS = [
  { id:'free',    name:'Free',    price:0,   desc:'Get started', color:'#6b7280' },
  { id:'starter', name:'Starter', price:15, annualPrice:12, desc:'Essential SEO for one website', color:'#6366f1' },
  { id:'growth',  name:'Growth',  price:29, annualPrice:23, desc:'More capacity for growing businesses', color:'#8b5cf6' },
  { id:'pro',     name:'Pro',     price:59, annualPrice:47, desc:'Advanced marketing for active teams', color:'#ec4899' },
  { id:'agency',  name:'Agency',  price:99, annualPrice:79, desc:'Higher limits for agency workflows', color:'#f59e0b' },
];

const FEATURES: Record<string, { free: string; starter: string; growth: string; pro: string; agency: string }> = {
  'Websites':            { free:'1', starter:'1', growth:'3', pro:'5', agency:'10' },
  'Audits / month':      { free:'1', starter:'5', growth:'15', pro:'40', agency:'100' },
  'AI content / month':  { free:'2', starter:'10', growth:'30', pro:'80', agency:'200' },
  'Google Ads AI tools': { free:'—', starter:'—', growth:'✓', pro:'✓', agency:'✓' },
  'Meta Ads AI tools':   { free:'—', starter:'—', growth:'—', pro:'✓', agency:'✓' },
  'Social posts/month':  { free:'—', starter:'—', growth:'10', pro:'30', agency:'100' },
  'Competitor analysis': { free:'—', starter:'✓', growth:'✓', pro:'✓', agency:'✓' },
  'Weekly reports':      { free:'—', starter:'—', growth:'✓', pro:'✓', agency:'✓' },
  'Branded PDF reports': { free:'—', starter:'—', growth:'—', pro:'✓', agency:'✓' },
};

export default function BillingPage() {
  const { user, limits, refreshUser, trialDaysLeft, isPaid, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [usage, setUsage] = useState<any>(null);
  const [requestedPlan, setRequestedPlan] = useState('');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const autoCheckoutStarted = useRef(false);

  useEffect(() => {
    const refreshMethods = () => paymentMethodsApi.listPublic().then(({ data }) => setAvailableProviders((data.methods || []).map((m:any) => m.provider))).catch(() => setAvailableProviders([]));
    refreshMethods();
    const methodsInterval = window.setInterval(refreshMethods, 15000);
    window.addEventListener('focus', refreshMethods);
    dashboardApi.getStats().then(({ data }) => {
      setUsage({ ...(data.usage || {}), websites: data.websiteCount || 0 });
    }).catch(() => setMsg('Could not load usage totals. Please refresh the page.'));
    const params = new URLSearchParams(window.location.search);
    const selected = params.get('plan') || '';
    if (['starter', 'growth', 'pro', 'agency'].includes(selected)) setRequestedPlan(selected);
    setBillingInterval(params.get('interval') === 'annual' ? 'annual' : 'monthly');
    return () => { window.clearInterval(methodsInterval); window.removeEventListener('focus', refreshMethods); };
  }, []);

  const upgrade = async (planId: string) => {
    if (!availableProviders.includes('lemon_squeezy')) {
      setMsg('Your selected plan is saved. Secure checkout is temporarily unavailable because no payment provider is enabled. You can retry from this page later; you will not be charged until checkout is completed.');
      return;
    }
    setLoading(planId);
    try {
      const { data } = await billingApi.createProviderCheckout('lemon_squeezy', planId, billingInterval);
      const checkoutUrl = new URL(data.url);
      if (checkoutUrl.protocol !== 'https:' || !(checkoutUrl.hostname === 'lemonsqueezy.com' || checkoutUrl.hostname.endsWith('.lemonsqueezy.com'))) throw new Error('Payment provider returned an invalid checkout URL.');
      window.location.assign(checkoutUrl.toString());
    } catch (err:any) {
      setMsg(err.response?.data?.error || err.message || 'Could not start checkout.');
    } finally { setLoading(''); }
  };

  useEffect(() => {
    const alreadyPaid = !!user && !['free', 'trial'].includes(user.plan);
    if (authLoading || !user || !requestedPlan || !availableProviders.includes('lemon_squeezy') || alreadyPaid || autoCheckoutStarted.current) return;
    autoCheckoutStarted.current = true;
    // Continue straight to hosted checkout for a plan selected before signup.
    upgrade(requestedPlan);
  }, [requestedPlan, availableProviders, authLoading, user?.id, user?.plan]);

  const openPortal = async () => {
    setLoading('portal');
    try {
      try {
        const { data } = await billingApi.openProviderPortal();
        window.location.href = data.url;
        return;
      } catch (providerErr: any) {
        if (providerErr.response?.data?.code !== 'LEGACY_BILLING') throw providerErr;
      }
      const { data } = await billingApi.openPortal();
      if (!data.url || !data.url.startsWith('https://billing.stripe.com/')) throw new Error('Billing provider returned an invalid portal URL.');
      window.location.href = data.url;
    } catch (err: any) {
      setMsg(err.response?.data?.error || 'No active subscription billing portal found.');
    } finally {
      setLoading('');
    }
  };

  const currentPlanIdx = PLANS.findIndex(p => p.id === user?.plan);
  const hasPaidPlan = !!user && !['free', 'trial'].includes(user.plan);

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
          {limits && usage && <>
            <UsageBar label="Audits" used={usage.audit || 0} max={limits.max_audits_per_month === 9999 ? 9999 : limits.max_audits_per_month} />
            <UsageBar label="AI Content" used={usage.content || 0} max={limits.max_content_per_month === 9999 ? 9999 : limits.max_content_per_month} color="#8b5cf6" />
            <UsageBar label="Social posts" used={usage.social || 0} max={limits.max_social_posts_per_month === 9999 ? 9999 : limits.max_social_posts_per_month} color="#f59e0b" />
            <UsageBar label="Websites" used={usage.websites || 0} max={limits.max_websites === 9999 ? 9999 : limits.max_websites} color="#ec4899" />
          </>}
        </div>
      </div>

      <p style={{ fontSize:12,color:'rgba(255,255,255,0.38)',marginBottom:18 }}>Your selected plan is highlighted below. When a verified provider is enabled, you’ll continue directly to its secure hosted checkout; your card details never pass through RankPilot.</p>

      <AvailablePaymentMethods compact />

      {/* Plans grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Available plans</h2>
        <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button type="button" onClick={() => setBillingInterval('monthly')} aria-pressed={billingInterval === 'monthly'} style={{ padding: '7px 12px', border: 0, borderRadius: 7, background: billingInterval === 'monthly' ? 'rgba(99,102,241,0.25)' : 'transparent', color: billingInterval === 'monthly' ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12 }}>Monthly</button>
          <button type="button" onClick={() => setBillingInterval('annual')} aria-pressed={billingInterval === 'annual'} style={{ padding: '7px 12px', border: 0, borderRadius: 7, background: billingInterval === 'annual' ? 'rgba(99,102,241,0.25)' : 'transparent', color: billingInterval === 'annual' ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12 }}>Annual · Save up to 20%</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 36 }}>
        {PLANS.filter(p => p.id !== 'free').map((plan, i) => {
          const isCurrent = plan.id === user?.plan;
          const isDowngrade = PLANS.findIndex(p => p.id === plan.id) < currentPlanIdx;
          return (
            <div key={plan.id} style={{ background: isCurrent || requestedPlan === plan.id ? `${plan.color}12` : 'rgba(255,255,255,0.02)', border: `1px solid ${isCurrent || requestedPlan === plan.id ? plan.color + '70' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '20px 16px', position: 'relative' }}>
              {isCurrent && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 12px', borderRadius: 100, whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>CURRENT</div>}
              {!isCurrent && requestedPlan === plan.id && <div style={{ position: 'absolute', top: -10, right: 10, background: plan.color, color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 100 }}>SELECTED</div>}
              <p style={{ fontSize: 11, fontWeight: 700, color: plan.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{plan.name}</p>
              <p style={{ fontSize: 26, fontWeight: 900, fontFamily: "'Plus Jakarta Sans',sans-serif", marginBottom: 4 }}>${billingInterval === 'annual' ? (plan.annualPrice ?? 0) : plan.price}<span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>/mo</span></p>
              {billingInterval === 'annual' && plan.id !== 'free' && <p style={{ fontSize: 11, color: '#4ade80', marginBottom: 8 }}>Billed ${(plan.annualPrice ?? 0) * 12}/year</p>}
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', marginBottom: 16 }}>{plan.desc}</p>
              {!isCurrent && (
                <button onClick={() => hasPaidPlan ? openPortal() : upgrade(plan.id)} disabled={!!loading} style={{ width: '100%', padding: '9px', background: isDowngrade ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg,${plan.color},${plan.color}cc)`, border: isDowngrade ? '1px solid rgba(255,255,255,0.1)' : 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: isDowngrade ? 'none' : `0 4px 16px ${plan.color}35` }}>
                  {loading === plan.id ? 'Redirecting...' : hasPaidPlan ? 'Manage existing billing' : availableProviders.includes('lemon_squeezy') ? (requestedPlan === plan.id ? 'Continue with this plan' : 'Upgrade') : 'Payments unavailable'}
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
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Payment options appear here when a verified provider is enabled · Contact support for billing help</p>
      </div>
    </div>
  );
}

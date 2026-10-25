'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi, seoApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const PAID_PLANS = ['starter', 'growth', 'pro', 'agency'];

export default function OnboardingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const checkoutComplete = params.get('checkout') === 'complete';
  const selectedPlan = params.get('plan') || '';
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [industry, setIndustry] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(checkoutComplete);
  const [paymentConfirmed, setPaymentConfirmed] = useState(!checkoutComplete);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?next=%2Fonboarding');
      return;
    }
    if (user.onboarding_completed) {
      router.replace('/dashboard');
      return;
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!checkoutComplete || authLoading || !user) return;
    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      try {
        const { data } = await authApi.me();
        if (cancelled) return;
        const current = data.user;
        const confirmed = PAID_PLANS.includes(current?.plan) &&
          ['active', 'cancelled'].includes(current?.subscription_status);
        if (confirmed) {
          setPaymentConfirmed(true);
          setCheckingPayment(false);
          await refreshUser();
          return;
        }
      } catch {
        // Keep the payment status pending; the provider may still be notifying the server.
      }
      attempts += 1;
      if (!cancelled && attempts < 40) {
        window.setTimeout(check, 3000);
      } else if (!cancelled) {
        setCheckingPayment(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [checkoutComplete, authLoading, user?.id]);

  const finish = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (siteUrl.trim()) {
        if (!siteName.trim()) throw new Error('Enter a name for your website.');
        await seoApi.addWebsite({ name: siteName.trim(), url: siteUrl.trim(), industry: industry.trim() || undefined });
      }
      await authApi.completeOnboarding();
      await refreshUser();
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not save your onboarding details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const retryPaymentCheck = async () => {
    setCheckingPayment(true);
    try {
      const { data } = await authApi.me();
      const current = data.user;
      const confirmed = PAID_PLANS.includes(current?.plan) &&
        ['active', 'cancelled'].includes(current?.subscription_status);
      setPaymentConfirmed(confirmed);
      if (confirmed) await refreshUser();
    } catch {
      setError('Could not verify payment yet. Please try again in a moment.');
    } finally {
      setCheckingPayment(false);
    }
  };

  if (authLoading || !user) return <main style={styles.page}><p style={styles.muted}>Loading your account…</p></main>;

  if (checkoutComplete && !paymentConfirmed) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.mark}>R</div>
          <p style={styles.eyebrow}>PAYMENT CONFIRMATION</p>
          <h1 style={styles.heading}>We’re confirming your payment</h1>
          <p style={styles.muted}>Your checkout has returned to RankPilot. We’ll unlock your selected plan as soon as the payment provider’s signed confirmation reaches us. Please don’t pay again.</p>
          {selectedPlan && <p style={styles.plan}>Selected plan: <strong>{selectedPlan[0].toUpperCase() + selectedPlan.slice(1)}</strong></p>}
          {checkingPayment && <p style={styles.muted}>Checking subscription status…</p>}
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.primary} onClick={retryPaymentCheck} disabled={checkingPayment}>Check payment status</button>
          <p style={styles.small}>This can take a short time. Your plan will only activate after server-side verification.</p>
          <Link href="/dashboard/billing" style={styles.link}>Return to billing</Link>
        </section>
      </main>
    );
  }

  const trialDays = user.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <div style={styles.mark}>R</div>
        <p style={styles.eyebrow}>{checkoutComplete ? 'PLAN CONFIRMED' : 'YOUR WORKSPACE'}</p>
        <h1 style={styles.heading}>Let’s set up RankPilot</h1>
        <p style={styles.muted}>A couple of details help us tailor your SEO workspace. You can skip the website for now and add it later.</p>
        <div style={styles.planCard}>
          <span style={styles.planLabel}>YOUR CURRENT PLAN</span>
          <strong style={styles.plan}>{user.plan === 'trial' ? 'Free trial' : user.plan[0].toUpperCase() + user.plan.slice(1)}</strong>
          {user.plan === 'trial'
            ? <span style={styles.small}>{trialDays} day{trialDays === 1 ? '' : 's'} left in your 14-day trial · Trial limits apply until you upgrade.</span>
            : <span style={styles.small}>{user.plan === 'free' ? 'Free plan · You can upgrade any time.' : 'Your subscription is active.'}</span>}
        </div>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={finish} style={styles.form}>
          <label style={styles.label}>Website name <span style={styles.optional}>optional</span>
            <input style={styles.input} value={siteName} onChange={e => setSiteName(e.target.value)} placeholder="e.g. My business" />
          </label>
          <label style={styles.label}>Website URL <span style={styles.optional}>optional</span>
            <input style={styles.input} type="url" value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://example.com" />
          </label>
          <label style={styles.label}>Industry <span style={styles.optional}>optional</span>
            <select style={styles.input} value={industry} onChange={e => setIndustry(e.target.value)}>
              <option value="">Choose an industry</option>
              <option value="ecommerce">E-commerce</option><option value="agency">Marketing agency</option>
              <option value="local-business">Local business</option><option value="saas">SaaS / Technology</option>
              <option value="publisher">Publisher / Blog</option><option value="other">Other</option>
            </select>
          </label>
          {siteUrl.trim() && !siteName.trim() && <p style={styles.small}>Add a website name to save the website.</p>}
          <button style={styles.primary} type="submit" disabled={saving || (Boolean(siteUrl.trim()) && !siteName.trim())}>
            {saving ? 'Saving your workspace…' : siteUrl.trim() ? 'Add website and continue' : 'Finish setup'}
          </button>
          <button style={styles.secondary} type="button" disabled={saving} onClick={() => { setSiteName(''); setSiteUrl(''); setIndustry(''); }}>
            Clear details
          </button>
        </form>
        <p style={styles.small}>Signed in as {user.email}. Your plan and usage limits are managed from the dashboard.</p>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#08080f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' },
  card: { width: '100%', maxWidth: 520, border: '1px solid rgba(255,255,255,.1)', borderRadius: 22, background: 'rgba(255,255,255,.035)', padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,.28)' },
  mark: { width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 20, marginBottom: 24 },
  eyebrow: { color: '#a5b4fc', letterSpacing: 2, fontSize: 11, fontWeight: 800 },
  heading: { fontSize: 30, lineHeight: 1.2, margin: '10px 0 12px', fontWeight: 800 },
  muted: { color: 'rgba(255,255,255,.62)', lineHeight: 1.65, fontSize: 14 },
  planCard: { display: 'flex', flexDirection: 'column', gap: 7, padding: 16, margin: '22px 0', borderRadius: 14, border: '1px solid rgba(129,140,248,.3)', background: 'rgba(99,102,241,.08)' },
  planLabel: { color: '#a5b4fc', fontSize: 10, letterSpacing: 1.4, fontWeight: 800 },
  plan: { fontSize: 20, textTransform: 'capitalize' },
  small: { color: 'rgba(255,255,255,.46)', fontSize: 12, lineHeight: 1.6, marginTop: 8 },
  form: { display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 },
  label: { display: 'flex', flexDirection: 'column', gap: 8, color: 'rgba(255,255,255,.82)', fontSize: 13, fontWeight: 600 },
  optional: { color: 'rgba(255,255,255,.38)', fontWeight: 400 },
  input: { width: '100%', boxSizing: 'border-box', borderRadius: 10, padding: '12px 13px', color: '#fff', background: '#11111d', border: '1px solid rgba(255,255,255,.13)', fontSize: 14 },
  primary: { border: 0, borderRadius: 11, padding: '13px 16px', color: '#fff', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', fontWeight: 800, cursor: 'pointer', marginTop: 4 },
  secondary: { border: '1px solid rgba(255,255,255,.14)', borderRadius: 11, padding: '12px 16px', color: '#fff', background: 'transparent', fontWeight: 600, cursor: 'pointer' },
  error: { color: '#fca5a5', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: 12, fontSize: 13 },
  link: { display: 'inline-block', color: '#a5b4fc', marginTop: 16, fontSize: 13 },
};

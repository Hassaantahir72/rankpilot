'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { billingApi, paymentMethodsApi } from '@/lib/api';

const PLANS: Record<string, { name: string; monthly: number; annual: number; description: string; features: string[] }> = {
  starter: { name: 'Starter', monthly: 15, annual: 12, description: 'Essential SEO for one website', features: ['1 website', '5 SEO audits/month', '10 AI content generations/month', 'Competitor analysis'] },
  growth: { name: 'Growth', monthly: 29, annual: 23, description: 'More capacity for growing businesses', features: ['3 websites', '15 SEO audits/month', '30 AI content generations/month', 'Google Ads AI', '10 social posts/month'] },
  pro: { name: 'Pro', monthly: 59, annual: 47, description: 'Advanced marketing for active teams', features: ['5 websites', '40 SEO audits/month', '80 AI content generations/month', 'Google + Meta Ads AI', '30 social posts/month'] },
  agency: { name: 'Agency', monthly: 99, annual: 79, description: 'Higher limits for agency workflows', features: ['10 websites', '100 SEO audits/month', '200 AI content generations/month', 'Google + Meta Ads AI', '100 social posts/month'] },
};

type BillingDetails = { name: string; email: string; country: string; state: string; zip: string; taxNumber: string };

export default function CheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const planId = params.get('plan') || '';
  const interval = params.get('interval') === 'annual' ? 'annual' : 'monthly';
  const plan = PLANS[planId];
  const [methods, setMethods] = useState<any[]>([]);
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<BillingDetails>({ name: '', email: '', country: '', state: '', zip: '', taxNumber: '' });
  const [otherCountryCode, setOtherCountryCode] = useState('');

  useEffect(() => {
    if (!plan) { router.replace('/pricing'); return; }
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/signup?plan=' + encodeURIComponent(planId) + '&interval=' + interval);
      return;
    }
    setDetails(current => ({ ...current, name: current.name || user.name || '', email: current.email || user.email || '' }));
  }, [plan, planId, interval, authLoading, user, router]);

  useEffect(() => {
    let active = true;
    paymentMethodsApi.listPublic()
      .then(({ data }) => {
        if (!active) return;
        const available = Array.isArray(data.methods) ? data.methods : [];
        setMethods(available);
        setProvider(current => current || available[0]?.provider || '');
      })
      .catch(() => { if (active) setMethods([]); });
    return () => { active = false; };
  }, []);

  const price = useMemo(() => plan ? (interval === 'annual' ? plan.annual : plan.monthly) : 0, [plan, interval]);
  const update = (key: keyof BillingDetails) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDetails(current => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!user) {
      router.push('/auth/signup?plan=' + encodeURIComponent(planId) + '&interval=' + interval);
      return;
    }
    if (!provider || !methods.some(method => method.provider === provider)) {
      setError('Secure checkout is not available yet. No payment method is currently enabled for customers.');
      return;
    }
    if (!details.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim()) || !/^[A-Za-z]{2}$/.test(details.country === 'OTHER' ? otherCountryCode : details.country)) {
      setError('Enter your billing name, a valid billing email, and select your billing country.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await billingApi.createProviderCheckout(provider, planId, interval, {
        name: details.name.trim(),
        email: details.email.trim(),
        country: (details.country === 'OTHER' ? otherCountryCode : details.country).toUpperCase(),
        state: details.state.trim(),
        zip: details.zip.trim(),
        taxNumber: details.taxNumber.trim(),
      });
      const checkoutUrl = new URL(data.url);
      const trusted = checkoutUrl.protocol === 'https:' &&
        (checkoutUrl.hostname === 'lemonsqueezy.com' || checkoutUrl.hostname.endsWith('.lemonsqueezy.com'));
      if (!trusted) throw new Error('The payment provider returned an untrusted checkout address.');
      window.location.assign(checkoutUrl.toString());
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not start secure checkout. Please try again.');
      setLoading(false);
    }
  };

  if (!plan) return <main style={styles.page}><p style={styles.muted}>Loading selected plan…</p></main>;

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <Link href="/pricing" style={styles.back}>← Back to plans</Link>
        <header style={styles.header}>
          <Link href="/" style={styles.brand}><span style={styles.logo}>R</span><span>RankPilot</span></Link>
          <div style={styles.secure}>🔒 Secure checkout</div>
        </header>
        <div style={styles.steps}>
          <span style={styles.doneStep}>✓ Account verified</span><span style={styles.activeStep}>2 · Billing & payment</span><span style={styles.step}>3 · Payment confirmed</span><span style={styles.step}>4 · Workspace setup</span>
        </div>
        <div className="checkout-columns" style={styles.columns}>
          <section style={styles.panel}>
            <p style={styles.eyebrow}>STEP 2 OF 4</p>
            <h1 style={styles.title}>Review your checkout</h1>
            <p style={styles.muted}>Confirm your billing details and choose an available payment method. Your account email has already been verified.</p>
            <form onSubmit={submit} style={styles.form}>
              <h2 style={styles.sectionTitle}>Billing contact</h2>
              <label style={styles.label}>Full name
                <input style={styles.input} autoComplete="name" value={details.name} onChange={update('name')} maxLength={120} required placeholder="Your billing name" />
              </label>
              <label style={styles.label}>Billing email
                <input style={styles.input} type="email" autoComplete="email" value={details.email} onChange={update('email')} maxLength={254} required placeholder="you@company.com" />
              </label>
              <h2 style={styles.sectionTitle}>Billing address</h2>
              <label style={styles.label}>Country / region
                <select style={styles.input} autoComplete="country" value={details.country} onChange={update('country')} required>
                  <option value="">Select country</option>
                  <option value="PK">Pakistan</option><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option><option value="AE">United Arab Emirates</option><option value="IN">India</option><option value="SA">Saudi Arabia</option><option value="DE">Germany</option><option value="FR">France</option><option value="NL">Netherlands</option><option value="SG">Singapore</option><option value="NZ">New Zealand</option><option value="JP">Japan</option><option value="IT">Italy</option><option value="ES">Spain</option><option value="CH">Switzerland</option><option value="BR">Brazil</option><option value="MX">Mexico</option><option value="ZA">South Africa</option><option value="MY">Malaysia</option><option value="ID">Indonesia</option><option value="TR">Türkiye</option><option value="NO">Norway</option><option value="SE">Sweden</option><option value="DK">Denmark</option><option value="IE">Ireland</option><option value="PL">Poland</option><option value="OTHER">Other (enter country code)</option>
                </select>
              </label>
              {details.country === 'OTHER' && <label style={styles.label}>Two-letter country code
                <input style={styles.input} value={otherCountryCode} onChange={e => setOtherCountryCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))} minLength={2} maxLength={2} required placeholder="e.g. BR" />
              </label>}
              <div style={styles.twoCols}>
                <label style={styles.label}>State / province <span style={styles.optional}>Optional</span>
                  <input style={styles.input} autoComplete="address-level1" value={details.state} onChange={update('state')} maxLength={100} placeholder="State or province" />
                </label>
                <label style={styles.label}>Postal code <span style={styles.optional}>Optional</span>
                  <input style={styles.input} autoComplete="postal-code" value={details.zip} onChange={update('zip')} maxLength={24} placeholder="Postal code" />
                </label>
              </div>
              <label style={styles.label}>Tax / VAT number <span style={styles.optional}>Optional</span>
                <input style={styles.input} value={details.taxNumber} onChange={update('taxNumber')} maxLength={80} placeholder="If applicable" />
              </label>
              <h2 style={styles.sectionTitle}>Payment method</h2>
              {methods.length ? (
                <div style={styles.methods}>
                  {methods.map((method: any) => (
                    <label key={method.provider} style={{ ...styles.method, borderColor: provider === method.provider ? 'rgba(129,140,248,.75)' : 'rgba(255,255,255,.12)', background: provider === method.provider ? 'rgba(99,102,241,.1)' : 'rgba(255,255,255,.02)' }}>
                      <input type="radio" name="provider" value={method.provider} checked={provider === method.provider} onChange={() => setProvider(method.provider)} />
                      <span style={{ flex: 1 }}><strong style={styles.methodName}>{method.name}</strong><span style={styles.methodDescription}>{method.description || 'Secure online payment'}</span></span>
                      <span style={styles.badge}>Available</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div style={styles.unavailable}>
                  <strong style={{ color: '#fbbf24', fontSize: 13 }}>Payment methods are being configured</strong>
                  <p style={styles.muted}>No verified provider is enabled yet, so checkout cannot accept a payment right now. We will never pretend a payment succeeded or activate a paid plan without provider confirmation.</p>
                </div>
              )}
              {error && <p role="alert" style={styles.error}>{error}</p>}
              <button type="submit" disabled={loading || !methods.length} style={{ ...styles.primary, opacity: loading || !methods.length ? .55 : 1 }}>
                {loading ? 'Connecting securely…' : methods.length ? 'Continue to secure payment →' : 'Secure payment unavailable'}
              </button>
              <p style={styles.privacy}>Card details are entered only on the payment provider’s secure checkout. RankPilot does not store card numbers. The provider may request additional address details to calculate tax and complete payment.</p>
            </form>
          </section>
          <aside style={styles.summary}>
            <p style={styles.eyebrow}>ORDER SUMMARY</p>
            <h2 style={styles.planName}>{plan.name}</h2>
            <p style={styles.muted}>{plan.description}</p>
            <div style={styles.priceRow}><span style={styles.price}>{'$' + price}<small style={styles.per}>/mo</small></span><span style={styles.period}>{interval === 'annual' ? 'Billed yearly' : 'Billed monthly'}</span></div>
            {interval === 'annual' && <p style={styles.annual}>{'$' + (price * 12)} billed annually</p>}
            <div style={styles.rule}/>
            <p style={styles.sectionTitle}>Included in {plan.name}</p>
            {plan.features.map(feature => <p key={feature} style={styles.feature}><span style={{ color: '#86efac' }}>✓</span>{feature}</p>)}
            <div style={styles.rule}/>
            <div style={styles.total}><span>Subscription</span><strong>{'$' + (price * (interval === 'annual' ? 12 : 1))} {interval === 'annual' ? '/ year' : '/ month'}</strong></div>
            <p style={styles.legal}>The final tax and total are calculated by the payment provider before you confirm payment. You will not be charged by RankPilot on this page.</p>
            <div style={styles.trust}>🔐 Verified account · Encrypted checkout · Server-confirmed subscription</div>
          </aside>
        </div>
      </div>
      <style jsx>{`
        @media (max-width: 760px) { .checkout-columns { grid-template-columns: minmax(0, 1fr) !important; } }
      `}</style>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#08080f', color: '#fff', padding: '28px 18px 64px', fontFamily: 'Inter, system-ui, sans-serif' },
  shell: { maxWidth: 1080, margin: '0 auto' },
  back: { display: 'inline-block', color: 'rgba(255,255,255,.56)', textDecoration: 'none', fontSize: 13, marginBottom: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 },
  brand: { display: 'inline-flex', alignItems: 'center', gap: 10, color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 18 },
  logo: { display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', fontWeight: 900 },
  secure: { color: '#a5b4fc', fontSize: 12 },
  steps: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 },
  doneStep: { padding: '8px 12px', borderRadius: 100, background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.18)', color: '#86efac', fontSize: 11, fontWeight: 700 },
  activeStep: { padding: '8px 12px', borderRadius: 100, background: 'rgba(99,102,241,.14)', border: '1px solid rgba(129,140,248,.4)', color: '#c7d2fe', fontSize: 11, fontWeight: 700 },
  step: { padding: '8px 12px', borderRadius: 100, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.38)', fontSize: 11 },
  columns: { display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(280px,.8fr)', gap: 22, alignItems: 'start' },
  panel: { border: '1px solid rgba(255,255,255,.1)', borderRadius: 20, background: 'rgba(255,255,255,.025)', padding: 28 },
  summary: { border: '1px solid rgba(129,140,248,.22)', borderRadius: 20, background: 'linear-gradient(180deg,rgba(99,102,241,.08),rgba(255,255,255,.02))', padding: 26, position: 'sticky', top: 20 },
  eyebrow: { color: '#a5b4fc', fontSize: 10, letterSpacing: 1.8, fontWeight: 800, marginBottom: 10 },
  title: { fontSize: 30, lineHeight: 1.15, fontWeight: 850, letterSpacing: '-.03em', marginBottom: 10 },
  muted: { color: 'rgba(255,255,255,.58)', fontSize: 13, lineHeight: 1.65 },
  form: { display: 'flex', flexDirection: 'column', gap: 15, marginTop: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 800, margin: '8px 0 0', color: 'rgba(255,255,255,.88)' },
  label: { display: 'flex', flexDirection: 'column', gap: 7, color: 'rgba(255,255,255,.75)', fontSize: 12, fontWeight: 650 },
  optional: { color: 'rgba(255,255,255,.35)', fontWeight: 400 },
  input: { boxSizing: 'border-box', width: '100%', minWidth: 0, border: '1px solid rgba(255,255,255,.14)', borderRadius: 10, padding: '12px 13px', color: '#fff', background: '#11111d', fontSize: 14, outline: 'none' },
  twoCols: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 },
  methods: { display: 'flex', flexDirection: 'column', gap: 10 },
  method: { display: 'flex', alignItems: 'center', gap: 12, padding: 13, border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, cursor: 'pointer' },
  methodName: { display: 'block', fontSize: 13, color: '#fff' },
  methodDescription: { display: 'block', marginTop: 4, color: 'rgba(255,255,255,.45)', fontSize: 11 },
  badge: { color: '#86efac', background: 'rgba(74,222,128,.08)', padding: '4px 7px', borderRadius: 6, fontSize: 10 },
  unavailable: { border: '1px solid rgba(251,191,36,.2)', background: 'rgba(251,191,36,.04)', borderRadius: 12, padding: 14 },
  primary: { width: '100%', border: 0, borderRadius: 11, padding: '14px 16px', color: '#fff', background: 'linear-gradient(135deg,#6366f1,#7c3aed)', fontWeight: 800, cursor: 'pointer', marginTop: 3 },
  privacy: { color: 'rgba(255,255,255,.38)', fontSize: 11, lineHeight: 1.6 },
  error: { color: '#fca5a5', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: 12, fontSize: 12 },
  planName: { fontSize: 25, fontWeight: 900, marginBottom: 6 },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 8, marginTop: 22 },
  price: { fontSize: 36, fontWeight: 900, letterSpacing: '-.04em' },
  per: { fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,.4)', letterSpacing: 0 },
  period: { fontSize: 11, color: 'rgba(255,255,255,.48)', paddingBottom: 6 },
  annual: { color: '#86efac', fontSize: 12, marginTop: 5 },
  rule: { height: 1, background: 'rgba(255,255,255,.1)', margin: '20px 0' },
  feature: { display: 'flex', gap: 10, alignItems: 'start', fontSize: 12, color: 'rgba(255,255,255,.68)', marginTop: 12 },
  total: { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: 'rgba(255,255,255,.6)' },
  legal: { color: 'rgba(255,255,255,.38)', fontSize: 11, lineHeight: 1.6, marginTop: 14 },
  trust: { borderTop: '1px solid rgba(255,255,255,.08)', marginTop: 20, paddingTop: 15, color: 'rgba(255,255,255,.5)', fontSize: 11, lineHeight: 1.6 },
};

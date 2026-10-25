'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { billingApi, paymentMethodsApi } from '@/lib/api';
import AvailablePaymentMethods from '@/components/billing/AvailablePaymentMethods';
import { useEffect, useState } from 'react';

const PLANS = [
  {
    id:'starter', name:'Starter', price:15, color:'#6366f1',
    features:['1 website','5 SEO audits/month','10 AI content generations/month','Monthly rank tracking','Competitor analysis','Email support'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || '',
  },
  {
    id:'growth', name:'Growth', price:29, color:'#8b5cf6', popular:true,
    features:['3 websites','15 SEO audits/month','30 AI content generations/month','Weekly rank tracking','Google Ads AI tools','10 social posts/month','Weekly reports'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH || '',
  },
  {
    id:'pro', name:'Pro', price:59, color:'#ec4899',
    features:['5 websites','40 SEO audits/month','80 AI content generations/month','Google + Meta Ads AI tools','30 social posts/month','Branded PDF reports'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || '',
  },
  {
    id:'agency', name:'Agency', price:99, color:'#f59e0b',
    features:['10 websites','100 SEO audits/month','200 AI content generations/month','Google + Meta Ads AI tools','100 social posts/month','Branded PDF reports'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_AGENCY || '',
  },
];

export default function UpgradePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);

  useEffect(() => {
    paymentMethodsApi.listPublic().then(({ data }) => setAvailableProviders((data.methods || []).map((m:any) => m.provider))).catch(() => setAvailableProviders([]));
  }, []);

  const upgrade = async (planId: string) => {
    if (!availableProviders.includes('lemon_squeezy')) {
      setError('No verified payment provider is currently available. Please contact support while payment setup is completed.');
      return;
    }
    setLoading(planId);
    try {
      const { data } = await billingApi.createProviderCheckout('lemon_squeezy', planId, 'monthly');
      const checkoutUrl = new URL(data.url);
      if (checkoutUrl.protocol !== 'https:' || !(checkoutUrl.hostname === 'lemonsqueezy.com' || checkoutUrl.hostname.endsWith('.lemonsqueezy.com'))) throw new Error('Payment provider returned an invalid checkout URL.');
      window.location.assign(checkoutUrl.toString());
    } catch (err:any) {
      setError(err.response?.data?.error || err.message || 'Could not start checkout.');
    } finally { setLoading(''); }
  };

  const PLAN_ORDER = ['free','trial','starter','growth','pro','agency'];
  const currentIdx = PLAN_ORDER.indexOf(user?.plan || 'free');

  return (
    <div>
      <div style={{ marginBottom:36, textAlign:'center' }}>
        <h1 style={{ fontSize:28,fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:10,lineHeight:1.15 }}>
          Upgrade your plan
        </h1>
        <p style={{ color:'rgba(255,255,255,0.45)',fontSize:15,maxWidth:440,margin:'0 auto' }}>
          You're on the <strong style={{ color:'#818cf8',textTransform:'capitalize' }}>{user?.plan}</strong> plan. Upgrade to unlock more features.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom:24,padding:'12px 16px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.22)',borderRadius:10,fontSize:14,color:'#fca5a5',textAlign:'center' }}>
          {error}
        </div>
      )}

      <AvailablePaymentMethods compact />

      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:16 }}>
        {PLANS.map((plan, i) => {
          const isCurrent = plan.id === user?.plan;
          const isDowngrade = PLAN_ORDER.indexOf(plan.id) < currentIdx;
          return (
            <div key={plan.id} style={{ background:isCurrent?`${plan.color}10`:'rgba(255,255,255,0.02)', border:`1px solid ${isCurrent?plan.color+'40':'rgba(255,255,255,0.08)'}`, borderRadius:18, padding:28, display:'flex', flexDirection:'column', position:'relative' }}>
              {(plan as any).popular && !isCurrent && (
                <div style={{ position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',fontSize:10,fontWeight:700,padding:'3px 14px',borderRadius:100,whiteSpace:'nowrap',letterSpacing:'0.06em' }}>MOST POPULAR</div>
              )}
              {isCurrent && (
                <div style={{ position:'absolute',top:-11,left:'50%',transform:'translateX(-50%)',background:plan.color,color:'#fff',fontSize:10,fontWeight:700,padding:'3px 14px',borderRadius:100,whiteSpace:'nowrap' }}>CURRENT PLAN</div>
              )}

              <p style={{ fontSize:11,fontWeight:700,color:plan.color,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8 }}>{plan.name}</p>
              <div style={{ display:'flex',alignItems:'baseline',gap:4,marginBottom:20 }}>
                <span style={{ fontSize:40,fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>${plan.price}</span>
                <span style={{ color:'rgba(255,255,255,0.35)',fontSize:13 }}>/mo</span>
              </div>

              <ul style={{ listStyle:'none',flex:1,display:'flex',flexDirection:'column',gap:9,marginBottom:24 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display:'flex',gap:9,fontSize:13 }}>
                    <svg style={{ flexShrink:0,marginTop:2 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                    <span style={{ color:'rgba(255,255,255,0.68)' }}>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div style={{ padding:'11px',textAlign:'center',background:'rgba(255,255,255,0.05)',borderRadius:10,fontSize:13,color:'rgba(255,255,255,0.4)',border:'1px solid rgba(255,255,255,0.08)' }}>
                  ✓ Current plan
                </div>
              ) : (
                <button
                  onClick={() => upgrade(plan.id)}
                  disabled={!!loading}
                  style={{ padding:'12px',background:isDowngrade?'rgba(255,255,255,0.05)':`linear-gradient(135deg,${plan.color},${plan.color}cc)`, border:isDowngrade?'1px solid rgba(255,255,255,0.1)':'none', borderRadius:10, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', boxShadow:isDowngrade?'none':`0 4px 20px ${plan.color}35`, transition:'all 0.2s' }}>
                  {loading===plan.id ? 'Redirecting...' : !availableProviders.includes('lemon_squeezy') ? 'Payments unavailable' : isDowngrade ? 'Downgrade' : `Upgrade to ${plan.name} →`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ textAlign:'center',marginTop:32 }}>
        <p style={{ fontSize:13,color:'rgba(255,255,255,0.25)',marginBottom:12 }}>
          ✓ 14-day free trial on all plans &nbsp;·&nbsp; ✓ No credit card to try &nbsp;·&nbsp; ✓ Cancel any time
        </p>
        <Link href="/dashboard/billing" style={{ fontSize:13,color:'#818cf8',textDecoration:'none' }}>
          ← Back to billing overview
        </Link>
      </div>
    </div>
  );
}

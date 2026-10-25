'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { AuthProvider } from '@/lib/auth';

function SignupForm() {
  const [form, setForm] = useState({name:'',email:'',password:''});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupPlan, setSignupPlan] = useState('');
  const [signupInterval, setSignupInterval] = useState<'monthly' | 'annual'>('monthly');
  const planPrices: Record<string, { monthly: number; annual: number }> = { starter: { monthly: 15, annual: 12 }, growth: { monthly: 29, annual: 23 }, pro: { monthly: 59, annual: 47 }, agency: { monthly: 99, annual: 79 } };
  const router = useRouter();

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('plan') || '';
    setSignupPlan(['starter', 'growth', 'pro', 'agency'].includes(requested) ? requested : '');
    setSignupInterval(new URLSearchParams(window.location.search).get('interval') === 'annual' ? 'annual' : 'monthly');
  }, []);
  const set = (k:string) => (e:any) => setForm(f=>({...f,[k]:e.target.value}));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const requestedPlan = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('plan') : null;
      const allowedPlans = ['starter', 'growth', 'pro', 'agency'];
      const selectedPlan = requestedPlan && allowedPlans.includes(requestedPlan) ? requestedPlan : '';
      const selectedInterval = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('interval') : null;
      const deviceSignature = [navigator.platform || 'unknown', screen.width, screen.height, screen.colorDepth, window.devicePixelRatio || 1, Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown', navigator.language || 'unknown', navigator.hardwareConcurrency || 0, (navigator as any).deviceMemory || 0].join('|');
      const { data } = await authApi.register({ ...form, deviceSignature, selectedPlan, selectedInterval: selectedInterval === 'annual' ? 'annual' : 'monthly' });
      const intervalParam = selectedInterval === 'annual' ? '&interval=annual' : '';
      const planParam = requestedPlan && allowedPlans.includes(requestedPlan) ? `&plan=${encodeURIComponent(requestedPlan)}` : '';
      router.push(`/auth/verify-email?userId=${encodeURIComponent(data.userId)}&type=verify${planParam}${intervalParam}${!selectedPlan ? '&flow=trial' : ''}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'#08080f',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative'}}>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 50% 40% at 50% 0%,rgba(99,102,241,0.12),transparent)',pointerEvents:'none'}}/>
      <div style={{width:'100%',maxWidth:440,position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:10,textDecoration:'none',marginBottom:20}}>
            <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#6366f1,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'#fff'}}>R</div>
            <span style={{fontWeight:700,fontSize:18,color:'#fff'}}>RankPilot</span>
          </Link>
          <h1 style={{fontSize:26,fontWeight:800,marginBottom:8,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{signupPlan ? 'Create your RankPilot account' : 'Start your 14-day free trial'}</h1>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.55)',lineHeight:1.7}}>{signupPlan ? 'Step 1 of 4 · Create your account and verify your email. Then review billing details and continue to secure payment before workspace setup.' : 'Create your account, verify your email, then set up your workspace. No payment details are needed for the Free Trial.'}</p>
          <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:18,flexWrap:'wrap'}}>
            {['1 · Account','2 · Verify email',signupPlan ? '3 · Billing & payment' : '3 · Free Trial','4 · Workspace'].map((step,i)=><span key={step} style={{fontSize:11,padding:'7px 10px',borderRadius:100,border:'1px solid '+(i===0?'rgba(129,140,248,.5)':'rgba(255,255,255,.1)'),background:i===0?'rgba(99,102,241,.13)':'rgba(255,255,255,.025)',color:i===0?'#c7d2fe':'rgba(255,255,255,.45)'}}>{step}</span>)}
          </div>
          {signupPlan && <div style={{marginTop:18,padding:16,textAlign:'left',borderRadius:14,border:'1px solid rgba(129,140,248,.25)',background:'rgba(99,102,241,.07)'}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}>
              <strong style={{fontSize:15,color:'#fff'}}>{signupPlan[0].toUpperCase()+signupPlan.slice(1)} plan</strong>
              <strong style={{fontSize:16,color:'#c7d2fe'}}>${planPrices[signupPlan][signupInterval]}/mo</strong>
            </div>
            <p style={{fontSize:12,color:'rgba(255,255,255,.48)',marginTop:7}}>{signupInterval==='annual'?'Annual billing; paid yearly.':'Monthly billing.'} Payment is collected by the provider only after you review the checkout total.</p>
          </div>}
        </div>
        {!signupPlan && <div style={{marginTop:18,padding:16,textAlign:'left',borderRadius:14,border:'1px solid rgba(74,222,128,.2)',background:'rgba(74,222,128,.05)'}}>
            <strong style={{fontSize:14,color:'#86efac'}}>Your selected plan: 14-day Free Trial</strong>
            <p style={{fontSize:12,color:'rgba(255,255,255,.58)',lineHeight:1.7,marginTop:8}}>Includes 1 website, 5 SEO audits/month, 10 AI content generations/month, 5 social posts/month, competitor analysis, and weekly rank tracking. Google Ads AI, Meta Ads AI, and branded reports are not included. No card is required and no automatic charge starts after trial signup.</p>
          </div>}
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:32}}>
          {!signupPlan && <p style={{fontSize:11,lineHeight:1.6,color:'rgba(255,255,255,0.42)',marginTop:12}}>To reduce repeated free-trial abuse across browsers, RankPilot checks a privacy-preserving device signal. Only a one-way hash is stored; raw browser/device attributes are not saved. Web browsers do not expose a guaranteed unique hardware ID, so this is an anti-abuse measure rather than perfect device identification.</p>}
          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:18}}>
            {error&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.22)',color:'#fca5a5',padding:'12px 16px',borderRadius:10,fontSize:14}}>{error}</div>}
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Your name</label>
              <input className="input-dark" value={form.name} onChange={set('name')} placeholder="John Smith" required/>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Work email</label>
              <input className="input-dark" type="email" value={form.email} onChange={set('email')} placeholder="you@company.com" required/>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Password</label>
              <input className="input-dark" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" minLength={8} required/>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{justifyContent:'center',fontSize:15,padding:'13px',marginTop:4}}>
              {loading?'Creating account...':'Create account — verify email →'}
            </button>
          </form>
          <div style={{marginTop:20,padding:'12px 14px',background:'rgba(99,102,241,0.06)',borderRadius:10,border:'1px solid rgba(99,102,241,0.15)'}}>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>📧 We'll send a 6-digit verification code to your email to activate your account.</p>
          </div>
          <p style={{marginTop:16,fontSize:12,color:'rgba(255,255,255,0.25)',textAlign:'center'}}>
            By signing up you agree to our <Link href="/terms" style={{color:'rgba(255,255,255,0.4)',textDecoration:'underline'}}>Terms</Link> and <Link href="/privacy" style={{color:'rgba(255,255,255,0.4)',textDecoration:'underline'}}>Privacy Policy</Link>.
          </p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:16}}>
          {(signupPlan ? ['✓ Secure hosted checkout','✓ Payment verified server-side','✓ Workspace setup after payment'] : ['✓ No credit card','✓ 14-day trial','✓ One trial per device']).map(f=>(
            <div key={f} style={{textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.02)',borderRadius:10,padding:'10px',border:'1px solid rgba(255,255,255,0.06)'}}>{f}</div>
          ))}
        </div>
        <p style={{textAlign:'center',marginTop:20,fontSize:14,color:'rgba(255,255,255,0.38)'}}>
          Have an account? <Link href="/auth/login" style={{color:'#818cf8',textDecoration:'none',fontWeight:500}}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return <AuthProvider><SignupForm/></AuthProvider>;
}

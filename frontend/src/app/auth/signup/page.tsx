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
  const router = useRouter();

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('plan') || '';
    setSignupPlan(['starter', 'growth', 'pro', 'agency'].includes(requested) ? requested : '');
  }, []);
  const set = (k:string) => (e:any) => setForm(f=>({...f,[k]:e.target.value}));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const requestedPlan = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('plan') : null;
      const allowedPlans = ['starter', 'growth', 'pro', 'agency'];
      const selectedPlan = requestedPlan && allowedPlans.includes(requestedPlan) ? requestedPlan : '';
      const deviceSignature = [navigator.platform || 'unknown', screen.width, screen.height, screen.colorDepth, window.devicePixelRatio || 1, Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown', navigator.language || 'unknown', navigator.hardwareConcurrency || 0, (navigator as any).deviceMemory || 0].join('|');
      const { data } = await authApi.register({ ...form, deviceSignature, selectedPlan });
      const selectedInterval = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('interval') : null;
      const intervalParam = selectedInterval === 'annual' ? '&interval=annual' : '';
      const planParam = requestedPlan && allowedPlans.includes(requestedPlan) ? `&plan=${encodeURIComponent(requestedPlan)}` : '';
      router.push(`/auth/verify-email?userId=${encodeURIComponent(data.userId)}&type=verify${planParam}${intervalParam}`);
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
          <p style={{fontSize:14,color:'rgba(255,255,255,0.38)'}}>{signupPlan ? `Selected plan: ${signupPlan[0].toUpperCase()+signupPlan.slice(1)} · Verify your email, complete secure checkout, then set up your workspace.` : '14 days free · No card required to start · Cancel any time'}</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:32}}>
          <p style={{fontSize:11,lineHeight:1.6,color:'rgba(255,255,255,0.42)',marginTop:12}}>To help prevent repeated free-trial abuse, RankPilot checks a privacy-preserving device signal. Basic display, platform, language and timezone attributes are converted to a one-way hash on our server; raw attributes are not stored. This signal is approximate and is not a guaranteed unique hardware identifier.</p>
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
          {['✓ No credit card','✓ 14-day trial','✓ Cancel anytime'].map(f=>(
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

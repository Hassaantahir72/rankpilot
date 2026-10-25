'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { AuthProvider } from '@/lib/auth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      if (data.requires2FA) {
        router.push(`/auth/verify-email?userId=${data.userId}&type=login`);
      } else if (data.requiresVerification) {
        router.push(`/auth/verify-email?userId=${data.userId}&type=verify`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:'#08080f',display:'flex',alignItems:'center',justifyContent:'center',padding:24,position:'relative'}}>
      <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 50% 40% at 50% 0%,rgba(99,102,241,0.12),transparent)',pointerEvents:'none'}}/>
      <div style={{width:'100%',maxWidth:420,position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <Link href="/" style={{display:'inline-flex',alignItems:'center',gap:10,textDecoration:'none',marginBottom:20}}>
            <div style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#6366f1,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'#fff'}}>R</div>
            <span style={{fontWeight:700,fontSize:18,color:'#fff'}}>RankPilot</span>
          </Link>
          <h1 style={{fontSize:26,fontWeight:800,marginBottom:8,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Welcome back</h1>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.38)'}}>Sign in — a verification code will be emailed to you</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:32}}>
          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:18}}>
            {error&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.22)',color:'#fca5a5',padding:'12px 16px',borderRadius:10,fontSize:14}}>{error}</div>}
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Email</label>
              <input className="input-dark" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required/>
            </div>
            <div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <label style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Password</label>
                <Link href="/auth/forgot-password" style={{fontSize:12,color:'#818cf8',textDecoration:'none'}}>Forgot password?</Link>
              </div>
              <input className="input-dark" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{justifyContent:'center',fontSize:15,padding:'13px',marginTop:4}}>
              {loading?'Sending code...':'Sign in — get email code →'}
            </button>
          </form>
          <div style={{marginTop:20,padding:'12px 14px',background:'rgba(99,102,241,0.06)',borderRadius:10,border:'1px solid rgba(99,102,241,0.15)'}}>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.6}}>🔐 For security, we'll email you a 6-digit code every time you sign in.</p>
          </div>
        </div>
        <p style={{textAlign:'center',marginTop:24,fontSize:14,color:'rgba(255,255,255,0.38)'}}>
          No account? <Link href="/auth/signup" style={{color:'#818cf8',textDecoration:'none',fontWeight:500}}>Start free trial →</Link>
        </p>
        <div style={{textAlign:'center',marginTop:16}}>
          <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'11px 24px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'rgba(255,255,255,0.65)',fontSize:14,textDecoration:'none',fontWeight:500,transition:'all 0.2s'}}>
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <AuthProvider><LoginForm/></AuthProvider>;
}

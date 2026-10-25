'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await authApi.forgotPassword(email);
      if (data.userId) {
        setUserId(data.userId);
        setSent(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong.');
    }
    setLoading(false);
  };

  const goReset = () => {
    if (userId) router.push(`/auth/reset-password?userId=${userId}`);
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
          <h1 style={{fontSize:24,fontWeight:800,marginBottom:8,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Reset your password</h1>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.4)'}}>Enter your email and we'll send a 6-digit reset code.</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:20,padding:32}}>
          {sent ? (
            <div style={{textAlign:'center',padding:'8px 0'}}>
              <div style={{fontSize:52,marginBottom:18}}>📧</div>
              <h3 style={{fontSize:18,fontWeight:700,marginBottom:10}}>Check your email</h3>
              <p style={{fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.7,marginBottom:28}}>
                We sent a 6-digit reset code to <strong style={{color:'#818cf8'}}>{email}</strong>. Enter it on the next page to set a new password.
              </p>
              <button onClick={goReset} className="btn-primary" style={{width:'100%',justifyContent:'center',fontSize:15,padding:'13px'}}>
                Enter reset code →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:18}}>
              {error&&<div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.22)',color:'#fca5a5',padding:'12px 16px',borderRadius:10,fontSize:14}}>{error}</div>}
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Email address</label>
                <input className="input-dark" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required/>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{justifyContent:'center',fontSize:15,padding:'13px'}}>
                {loading?'Sending code...':'Send reset code →'}
              </button>
              <Link href="/auth/login" style={{textAlign:'center',fontSize:14,color:'rgba(255,255,255,0.4)',textDecoration:'none'}}>← Back to sign in</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

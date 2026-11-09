'use client';
import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api', headers: { 'Content-Type':'application/json' } });

export default function OwnerAdminLoginPage() {
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [code,setCode] = useState('');
  const [stageToken,setStageToken] = useState('');
  const [secret,setSecret] = useState('');
  const [setup,setSetup] = useState(false);
  const [step,setStep] = useState<'credentials'|'email'|'totp'>('credentials');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');

  const request = async (path:string, body:any) => (await api.post(path,body)).data;
  const [userId,setUserId] = useState('');
  const startLogin = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = await request('/auth/admin/login',{email,password});
      setUserId(data.userId); setStep('email'); setNotice('A one-time code has been sent to the owner email address.');
    } catch(err:any) { setError(err.response?.data?.error || 'Could not start owner sign-in.'); }
    finally { setBusy(false); }
  };
  const verifyEmail = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = await request('/auth/admin/verify-email',{userId,otp:code});
      setStageToken(data.stageToken);
      if(data.requiresTotpSetup){ setSetup(true); setSecret(data.secret); }
      else setSetup(false);
      setCode(''); setStep('totp');
      setNotice(data.requiresTotpSetup ? 'Add the setup key to your authenticator app, then enter its current code.' : 'Enter the current code from your authenticator app.');
    } catch(err:any) { setError(err.response?.data?.error || 'Email code verification failed.'); }
    finally { setBusy(false); }
  };
  const verifyAuthenticator = async (e:React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const data = await request(setup?'/auth/admin/enroll-totp':'/auth/admin/verify-totp', setup?{stageToken,secret,code}:{stageToken,code});
      localStorage.setItem('rp_token',data.token);
      localStorage.removeItem('rp_user');
      window.location.assign('/dashboard/admin');
    } catch(err:any) { setError(err.response?.data?.error || 'Authenticator verification failed.'); }
    finally { setBusy(false); }
  };

  const field = {width:'100%',padding:'13px 14px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'rgba(255,255,255,.045)',color:'#fff',fontSize:15,outline:'none',boxSizing:'border-box' as const};
  const button = {width:'100%',padding:14,border:0,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#7c3aed)',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer' as const,opacity: busy ? 0.65 : 1};
  return <main style={{minHeight:'100vh',background:'#08080f',color:'#fff',display:'grid',placeItems:'center',padding:24,fontFamily:'Inter, sans-serif'}}>
    <section style={{width:'100%',maxWidth:440}}>
      <div style={{textAlign:'center',marginBottom:28}}>
        <Link href="/" style={{color:'#fff',textDecoration:'none',fontWeight:800,fontSize:20}}>⚡ RankPilot</Link>
        <p style={{color:'#a5b4fc',fontSize:12,fontWeight:700,letterSpacing:2,marginTop:22}}>OWNER ACCESS</p>
        <h1 style={{fontSize:27,margin:'8px 0'}}>Secure admin sign in</h1>
        <p style={{color:'#9ca3af',fontSize:14}}>Password, owner email verification, and authenticator approval are required.</p>
      </div>
      <div style={{background:'#11111b',border:'1px solid rgba(255,255,255,.1)',borderRadius:18,padding:28}}>
        <div style={{display:'flex',gap:8,marginBottom:22}}>
          {['Password','Email code','Authenticator'].map((s,i)=><div key={s} style={{flex:1,textAlign:'center',fontSize:10,color:(['credentials','email','totp'][i]===step)?'#c4b5fd':'#6b7280',borderBottom:'2px solid '+((['credentials','email','totp'][i]===step)?'#8b5cf6':'#30303d'),paddingBottom:9}}>{s}</div>)}
        </div>
        {error&&<p role="alert" style={{background:'#3b1119',color:'#fca5a5',padding:12,borderRadius:9,fontSize:13}}>{error}</p>}
        {notice&&<p style={{background:'#171b35',color:'#c7d2fe',padding:12,borderRadius:9,fontSize:13,lineHeight:1.5}}>{notice}</p>}
        {step==='credentials'&&<form onSubmit={startLogin} style={{display:'grid',gap:14}}>
          <label style={{fontSize:12,color:'#9ca3af'}}>Owner email<input style={{...field,marginTop:7}} type="email" placeholder="Owner email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" required /></label>
          <label style={{fontSize:12,color:'#9ca3af'}}>Password<input style={{...field,marginTop:7}} type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required /></label>
          <button style={button} disabled={busy}>{busy?'Checking…':'Continue securely'}</button>
        </form>}
        {step==='email'&&<form onSubmit={verifyEmail} style={{display:'grid',gap:14}}>
          <label style={{fontSize:12,color:'#9ca3af'}}>6-digit code sent to the owner email<input style={{...field,marginTop:7,textAlign:'center',letterSpacing:8,fontSize:22}} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required /></label>
          <button style={button} disabled={busy||code.length!==6}>{busy?'Verifying…':'Verify email code'}</button>
        </form>}
        {step==='totp'&&<form onSubmit={verifyAuthenticator} style={{display:'grid',gap:14}}>
          {setup&&<div style={{background:'#0b1020',border:'1px solid #303b69',borderRadius:10,padding:13}}>
            <p style={{fontSize:12,color:'#c7d2fe',margin:'0 0 8px'}}>Authenticator setup key (add it manually in your authenticator app)</p>
            <code style={{wordBreak:'break-all',fontSize:15,color:'#fff'}}>{secret}</code>
            <button type="button" onClick={()=>navigator.clipboard?.writeText(secret)} style={{display:'block',marginTop:10,background:'transparent',border:'1px solid #4b5563',color:'#c7d2fe',borderRadius:7,padding:'7px 10px',cursor:'pointer'}}>Copy setup key</button>
          </div>}
          <label style={{fontSize:12,color:'#9ca3af'}}>6-digit authenticator code<input style={{...field,marginTop:7,textAlign:'center',letterSpacing:8,fontSize:22}} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required /></label>
          <button style={button} disabled={busy||code.length!==6}>{busy?'Verifying…':setup?'Enable authenticator and sign in':'Verify and open admin panel'}</button>
        </form>}
      </div>
      <p style={{textAlign:'center',marginTop:18,fontSize:12,color:'#6b7280'}}>This is separate from customer sign-in. <Link href="/auth/login" style={{color:'#a5b4fc'}}>Customer login</Link></p>
    </section>
  </main>;
}

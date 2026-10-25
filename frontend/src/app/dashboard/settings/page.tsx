'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { billingApi } from '@/lib/api';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<'account'|'security'|'integrations'|'notifications'>('account');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok');
  const [loading, setLoading] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const showMsg = (text: string, type: 'ok'|'err' = 'ok') => { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 5000); };

  const openPortal = async () => {
    setLoading('portal');
    try { const { data } = await billingApi.openPortal(); window.location.href = data.url; }
    catch (err: any) { showMsg(err.response?.data?.error || 'No active subscription found.', 'err'); }
    setLoading('');
  };

  const TABS = [
    { id:'account',       label:'Account',       icon:'👤' },
    { id:'security',      label:'Security',       icon:'🔒' },
    { id:'integrations',  label:'Integrations',   icon:'🔗' },
    { id:'notifications', label:'Notifications',  icon:'🔔' },
  ] as const;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  return (
    <div>
      <h1 style={{ fontSize:24,fontWeight:800,marginBottom:6,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Settings</h1>
      <p style={{ color:'rgba(255,255,255,0.4)',marginBottom:28,fontSize:14 }}>Manage your account, security, and integrations.</p>

      {msg && (
        <div style={{ marginBottom:20,padding:'12px 16px',background:msgType==='err'?'rgba(239,68,68,0.08)':'rgba(74,222,128,0.08)',border:`1px solid ${msgType==='err'?'rgba(239,68,68,0.25)':'rgba(74,222,128,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='err'?'#fca5a5':'#4ade80',display:'flex',justifyContent:'space-between' }}>
          <span>{msg}</span><button onClick={() => setMsg('')} style={{ background:'none',border:'none',color:'inherit',cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:28,width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ACCOUNT */}
      {tab === 'account' && (
        <div style={{ maxWidth:540,display:'flex',flexDirection:'column',gap:16 }}>
          <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:24 }}>
            <h2 style={{ fontSize:15,fontWeight:700,marginBottom:20 }}>Profile</h2>
            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Display name</label>
                <input className="input-dark" defaultValue={user?.name || ''} placeholder="Your name"/>
              </div>
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Email address</label>
                <input className="input-dark" value={user?.email || ''} disabled style={{ opacity:0.5,cursor:'not-allowed' }}/>
                <p style={{ fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:5 }}>Contact support to change your email.</p>
              </div>
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Current plan</label>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <span style={{ fontSize:14,fontWeight:600,color:'#818cf8',textTransform:'capitalize' }}>{user?.plan} plan</span>
                  <Link href="/dashboard/billing" style={{ fontSize:12,color:'rgba(255,255,255,0.4)',textDecoration:'none',padding:'4px 12px',background:'rgba(255,255,255,0.05)',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)' }}>Manage →</Link>
                </div>
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button className="btn-primary" style={{ fontSize:13,padding:'10px 22px' }}>Save changes</button>
                {user?.subscription_status === 'active' && (
                  <button onClick={openPortal} disabled={!!loading} style={{ fontSize:13,padding:'10px 22px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,color:'rgba(255,255,255,0.65)',cursor:'pointer',fontFamily:'inherit' }}>
                    {loading === 'portal' ? 'Opening...' : 'Manage subscription'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ background:'rgba(239,68,68,0.04)',border:'1px solid rgba(239,68,68,0.15)',borderRadius:16,padding:24 }}>
            <h2 style={{ fontSize:15,fontWeight:700,marginBottom:8,color:'#f87171' }}>Danger zone</h2>
            <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:16,lineHeight:1.6 }}>Once you delete your account, all your data is permanently removed. This cannot be undone.</p>
            <div style={{ display:'flex',gap:12 }}>
              <button onClick={logout} style={{ fontSize:13,padding:'9px 20px',background:'transparent',border:'1px solid rgba(255,255,255,0.15)',borderRadius:8,color:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit' }}>Sign out</button>
              <button style={{ fontSize:13,padding:'9px 20px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,color:'#f87171',cursor:'pointer',fontFamily:'inherit' }}>Delete account</button>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY */}
      {tab === 'security' && (
        <div style={{ maxWidth:540,display:'flex',flexDirection:'column',gap:16 }}>
          <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:24 }}>
            <h2 style={{ fontSize:15,fontWeight:700,marginBottom:20 }}>Change Password</h2>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Current password</label>
                <input className="input-dark" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••"/>
              </div>
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>New password</label>
                <input className="input-dark" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="At least 8 characters"/>
              </div>
              <div>
                <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Confirm new password</label>
                <input className="input-dark" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password"/>
              </div>
              <button className="btn-primary" style={{ alignSelf:'flex-start',fontSize:13,padding:'10px 22px' }}>Update password</button>
            </div>
          </div>
          <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:24 }}>
            <h2 style={{ fontSize:15,fontWeight:700,marginBottom:8 }}>Two-Factor Authentication</h2>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:16 }}>
              <p style={{ fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.65,flex:1 }}>Email OTP is enabled on every login. A 6-digit code is sent to your email each time you sign in.</p>
              <div style={{ padding:'5px 14px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:100,fontSize:12,fontWeight:700,color:'#4ade80',whiteSpace:'nowrap',flexShrink:0 }}>Active ✓</div>
            </div>
          </div>
        </div>
      )}

      {/* INTEGRATIONS */}
      {tab === 'integrations' && (
        <div style={{ maxWidth:620,display:'flex',flexDirection:'column',gap:14 }}>

          {/* Google — most important */}
          <div style={{ background:'rgba(66,133,244,0.06)',border:'1px solid rgba(66,133,244,0.25)',borderRadius:16,padding:22 }}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:16,flexWrap:'wrap' }}>
              <div style={{ fontSize:32 }}>🔵</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:6 }}>
                  <p style={{ fontWeight:700,fontSize:15 }}>Google (Search Console + Ads)</p>
                  <span style={{ fontSize:11,padding:'2px 8px',background:'rgba(74,222,128,0.12)',borderRadius:100,color:'#4ade80',fontWeight:600 }}>RECOMMENDED</span>
                </div>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.65,marginBottom:14 }}>
                  Connects Google Search Console for <strong style={{ color:'#fff' }}>real keyword rankings</strong>, clicks, and impressions. Also enables Google Ads automation.
                </p>
                <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
                  <a href={`${API_URL}/auth/google`} style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'10px 20px',background:'linear-gradient(135deg,#4285F4,#34A853)',border:'none',borderRadius:10,color:'#fff',fontWeight:600,fontSize:13,textDecoration:'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24"><path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Connect Google
                  </a>
                  <Link href="/dashboard/gsc" style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'10px 18px',background:'rgba(66,133,244,0.1)',border:'1px solid rgba(66,133,244,0.25)',borderRadius:10,color:'#60a5fa',fontWeight:500,fontSize:13,textDecoration:'none' }}>
                    View Search Console →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:22 }}>
            <div style={{ display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' }}>
              <div style={{ fontSize:32 }}>📘</div>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700,fontSize:15,marginBottom:6 }}>Meta (Facebook + Instagram Ads)</p>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.65,marginBottom:14 }}>Required for Facebook and Instagram ad campaign automation. Available on Pro plan and above.</p>
                <a href={`${API_URL}/auth/meta`} style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'10px 18px',background:'rgba(59,89,152,0.15)',border:'1px solid rgba(59,89,152,0.3)',borderRadius:10,color:'#818cf8',fontWeight:500,fontSize:13,textDecoration:'none' }}>
                  Connect Meta →
                </a>
              </div>
            </div>
          </div>

          {/* Email reports info */}
          <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:22 }}>
            <div style={{ display:'flex',gap:14,alignItems:'flex-start' }}>
              <div style={{ fontSize:28 }}>📧</div>
              <div>
                <p style={{ fontWeight:700,fontSize:15,marginBottom:6 }}>Weekly Email Reports</p>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.65 }}>
                  Automated weekly performance reports are emailed every Monday to <strong style={{ color:'rgba(255,255,255,0.75)' }}>{user?.email}</strong>. Available on Growth plan and above.
                </p>
              </div>
            </div>
          </div>

          {/* PageSpeed */}
          <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:22 }}>
            <div style={{ display:'flex',gap:14,alignItems:'flex-start' }}>
              <div style={{ fontSize:28 }}>⚡</div>
              <div>
                <p style={{ fontWeight:700,fontSize:15,marginBottom:6 }}>Google PageSpeed Insights</p>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.65,marginBottom:10 }}>
                  Real performance scores (Core Web Vitals) for every page you audit. Add a free API key to increase rate limits to 25,000 calls/day.
                </p>
                <p style={{ fontSize:12,color:'rgba(255,255,255,0.3)' }}>
                  Get free key: <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color:'#818cf8',textDecoration:'none' }}>console.cloud.google.com</a> → Enable PageSpeed Insights API → Add to <code style={{ background:'rgba(255,255,255,0.06)',padding:'1px 6px',borderRadius:4,fontSize:11 }}>GOOGLE_PAGESPEED_KEY</code> in backend/.env
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div style={{ maxWidth:520 }}>
          <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:24 }}>
            <h2 style={{ fontSize:15,fontWeight:700,marginBottom:20 }}>Email Notifications</h2>
            {[
              { label:'Weekly performance reports',    desc:'Every Monday with your SEO and ad results',       on:true },
              { label:'SEO audit complete',             desc:'When your audit finishes and is ready to view',   on:true },
              { label:'Ranking changes',                desc:'When keywords move significantly in Google',       on:true },
              { label:'Trial ending reminder',          desc:'3 days before your trial expires',                on:true },
              { label:'Support ticket replies',         desc:'When the support team responds to your tickets',  on:true },
              { label:'Product updates',                desc:'New features and platform improvements',           on:false },
              { label:'Marketing tips',                 desc:'Weekly SEO and marketing advice from our team',   on:false },
            ].map((n, i) => (
              <div key={n.label} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 0',borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ fontSize:14,fontWeight:500,color:'rgba(255,255,255,0.8)',marginBottom:3 }}>{n.label}</p>
                  <p style={{ fontSize:12,color:'rgba(255,255,255,0.35)' }}>{n.desc}</p>
                </div>
                <div style={{ width:40,height:22,borderRadius:100,background:n.on?'#6366f1':'rgba(255,255,255,0.1)',cursor:'pointer',position:'relative',flexShrink:0,transition:'background 0.2s' }}>
                  <div style={{ width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:n.on?21:3,transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }}/>
                </div>
              </div>
            ))}
            <button className="btn-primary" style={{ marginTop:20,fontSize:13,padding:'10px 22px' }}>Save preferences</button>
          </div>
        </div>
      )}
    </div>
  );
}

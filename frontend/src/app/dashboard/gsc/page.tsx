'use client';
import { useState, useEffect } from 'react';
import { gscApi, seoApi } from '@/lib/api';
import Link from 'next/link';

export default function GSCPage() {
  const [status, setStatus]     = useState<any>(null);
  const [sites, setSites]       = useState<any[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedWebsite, setSelectedWebsite] = useState('');
  const [keywords, setKeywords] = useState<any[]>([]);
  const [pages, setPages]       = useState<any[]>([]);
  const [trend, setTrend]       = useState<any[]>([]);
  const [syncing, setSyncing]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState('');
  const [msgType, setMsgType]   = useState<'ok'|'err'>('ok');
  const [tab, setTab]           = useState<'keywords'|'pages'|'trend'>('keywords');

  useEffect(() => {
    loadStatus();
    seoApi.getWebsites().then(r => setWebsites(r.data.websites || [])).catch(() => {});
  }, []);

  const loadStatus = async () => {
    try { const { data } = await gscApi.getStatus(); setStatus(data); } catch {}
  };

  const loadSites = async () => {
    setLoading(true);
    try {
      const { data } = await gscApi.getSites();
      setSites(data.sites || []);
      if (!data.connected) showMsg('Google Search Console not connected. Connect Google in Settings first.', 'err');
    } catch (err: any) { showMsg(err.response?.data?.error || 'Not connected. Go to Settings → Integrations → Connect Google.', 'err'); }
    setLoading(false);
  };

  const syncRankings = async () => {
    if (!selectedWebsite) { showMsg('Select a website first.', 'err'); return; }
    setSyncing(true);
    try {
      const { data } = await gscApi.syncRankings(selectedWebsite, selectedSite);
      showMsg(`✅ ${data.synced} real rankings synced from Google Search Console!`, 'ok');
      loadKeywords();
    } catch (err: any) { showMsg(err.response?.data?.error || 'Sync failed. Make sure your website is verified in Google Search Console.', 'err'); }
    setSyncing(false);
  };

  const loadKeywords = async () => {
    if (!selectedWebsite) return;
    setLoading(true);
    try {
      const { data } = await gscApi.getKeywords(selectedWebsite);
      setKeywords(data.keywords || []);
    } catch (err: any) { showMsg(err.response?.data?.error || 'Failed to load keywords.', 'err'); }
    setLoading(false);
  };

  const loadPages = async () => {
    if (!selectedWebsite) return;
    setLoading(true);
    try {
      const { data } = await gscApi.getPages(selectedWebsite);
      setPages(data.pages || []);
    } catch (err: any) { showMsg(err.response?.data?.error || 'Failed.', 'err'); }
    setLoading(false);
  };

  const loadTrend = async () => {
    if (!selectedWebsite) return;
    setLoading(true);
    try {
      const { data } = await gscApi.getTrend(selectedWebsite);
      setTrend(data.trend || []);
    } catch {}
    setLoading(false);
  };

  const changeTab = (t: 'keywords'|'pages'|'trend') => {
    setTab(t);
    if (t === 'keywords') loadKeywords();
    if (t === 'pages')    loadPages();
    if (t === 'trend')    loadTrend();
  };

  const showMsg = (text: string, type: 'ok'|'err' = 'ok') => { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 8000); };

  const totalClicks      = keywords.reduce((s, k) => s + (k.clicks || 0), 0);
  const totalImpressions = keywords.reduce((s, k) => s + (k.impressions || 0), 0);
  const avgPosition      = keywords.length ? Math.round(keywords.reduce((s, k) => s + k.position, 0) / keywords.length) : 0;
  const top10            = keywords.filter(k => k.position <= 10).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:24 }}>
        <div style={{ width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#4285F4,#34A853)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>📊</div>
        <div>
          <h1 style={{ fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2 }}>Google Search Console</h1>
          <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)' }}>Real ranking data directly from Google — 100% free and accurate</p>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom:18,padding:'12px 16px',background:msgType==='err'?'rgba(239,68,68,0.08)':'rgba(74,222,128,0.08)',border:`1px solid ${msgType==='err'?'rgba(239,68,68,0.25)':'rgba(74,222,128,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='err'?'#fca5a5':'#4ade80',display:'flex',justifyContent:'space-between' }}>
          <span>{msg}</span><button onClick={() => setMsg('')} style={{ background:'none',border:'none',color:'inherit',cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Connection status */}
      <div style={{ background:'rgba(255,255,255,0.02)',border:`1px solid ${status?.connected?'rgba(74,222,128,0.3)':'rgba(255,255,255,0.08)'}`,borderRadius:16,padding:24,marginBottom:24 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14 }}>
          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ width:10,height:10,borderRadius:'50%',background:status?.connected?'#4ade80':'rgba(255,255,255,0.2)',boxShadow:status?.connected?'0 0 10px #4ade80':undefined }} />
            <div>
              <p style={{ fontWeight:700,fontSize:15,marginBottom:3 }}>{status?.connected ? 'Google Search Console connected ✓' : 'Not connected yet'}</p>
              <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)' }}>
                {status?.connected
                  ? `Last synced: ${status.lastSync ? new Date(status.lastSync).toLocaleDateString() : 'Never'}`
                  : 'Connect Google to get real keyword rankings, clicks and impressions from Google directly.'}
              </p>
            </div>
          </div>
          <div style={{ display:'flex',gap:10 }}>
            {!status?.connected ? (
              <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
                style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'10px 20px',background:'linear-gradient(135deg,#4285F4,#34A853)',border:'none',borderRadius:10,color:'#fff',fontWeight:600,fontSize:14,textDecoration:'none',cursor:'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Connect Google Account
              </a>
            ) : (
              <button onClick={loadSites} style={{ padding:'10px 18px',background:'rgba(66,133,244,0.12)',border:'1px solid rgba(66,133,244,0.3)',borderRadius:10,color:'#4285F4',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit' }}>
                Load Verified Sites
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Setup guide if not connected */}
      {!status?.connected && (
        <div style={{ background:'rgba(66,133,244,0.04)',border:'1px solid rgba(66,133,244,0.15)',borderRadius:14,padding:24,marginBottom:24 }}>
          <h3 style={{ fontSize:14,fontWeight:700,marginBottom:16,color:'#60a5fa' }}>🚀 How to set up Google Search Console (5 minutes)</h3>
          {[
            { step:'1', title:'Click "Connect Google Account" above', desc:'This gives RankPilot permission to read your Search Console data.' },
            { step:'2', title:'Verify your website in Google Search Console', desc:'Go to search.google.com/search-console → Add property → Enter your website URL → Verify ownership (add HTML tag to your site or use DNS).' },
            { step:'3', title:'Come back and sync your rankings', desc:'Once verified, select your website and click "Sync Rankings". You\'ll see your real keyword positions, clicks, and impressions from Google.' },
          ].map(s => (
            <div key={s.step} style={{ display:'flex',gap:14,marginBottom:14,alignItems:'flex-start' }}>
              <div style={{ width:28,height:28,borderRadius:'50%',background:'rgba(66,133,244,0.15)',border:'1px solid rgba(66,133,244,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#60a5fa',flexShrink:0 }}>{s.step}</div>
              <div>
                <p style={{ fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.85)',marginBottom:3 }}>{s.title}</p>
                <p style={{ fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Site selector + sync */}
      {status?.connected && (
        <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22,marginBottom:24 }}>
          <h3 style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Sync Rankings</h3>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:12,alignItems:'end' }}>
            <div>
              <label style={{ display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Your Website (in RankPilot)</label>
              <select className="input-dark" value={selectedWebsite} onChange={e => setSelectedWebsite(e.target.value)}>
                <option value="">Select website...</option>
                {websites.map((w: any) => <option key={w.id} value={w.id}>{w.name} — {w.url}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>GSC Property (verified site)</label>
              <select className="input-dark" value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
                <option value="">Auto-detect from website URL</option>
                {sites.map((s: any) => <option key={s.siteUrl} value={s.siteUrl}>{s.siteUrl}</option>)}
              </select>
            </div>
            <button onClick={syncRankings} disabled={syncing || !selectedWebsite} className="btn-primary" style={{ fontSize:14,padding:'11px 22px',whiteSpace:'nowrap' }}>
              {syncing ? '⏳ Syncing...' : '🔄 Sync Rankings'}
            </button>
          </div>
          <p style={{ fontSize:11,color:'rgba(255,255,255,0.28)',marginTop:10 }}>
            Pulls real keyword positions, clicks, and impressions from the last 28 days directly from Google.
          </p>
        </div>
      )}

      {/* Stats summary */}
      {keywords.length > 0 && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24 }}>
            {[
              { label:'Total keywords',    value:keywords.length,                       color:'#6366f1', icon:'🔑' },
              { label:'Total clicks',      value:totalClicks.toLocaleString(),           color:'#4ade80', icon:'👆' },
              { label:'Total impressions', value:totalImpressions.toLocaleString(),      color:'#818cf8', icon:'👁' },
              { label:'Keywords in Top 10',value:top10,                                  color:'#f59e0b', icon:'🏆' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,textAlign:'center' }}>
                <div style={{ fontSize:24,marginBottom:8 }}>{s.icon}</div>
                <p style={{ fontSize:24,fontWeight:900,color:s.color,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1,marginBottom:6 }}>{s.value}</p>
                <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:20,width:'fit-content' }}>
            {(['keywords','pages','trend'] as const).map(t => (
              <button key={t} onClick={() => changeTab(t)} style={{ padding:'8px 18px',borderRadius:9,border:'none',background:tab===t?'rgba(255,255,255,0.1)':'transparent',color:tab===t?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t?600:400,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize',transition:'all 0.2s' }}>
                {t === 'keywords' ? '🔑 Keywords' : t === 'pages' ? '📄 Pages' : '📈 Click Trend'}
              </button>
            ))}
          </div>

          {/* KEYWORDS */}
          {tab === 'keywords' && (
            <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.04)' }}>
                    {['Keyword','Position','Clicks','Impressions','CTR'].map(h => (
                      <th key={h} style={{ textAlign:'left',padding:'12px 16px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keywords.slice(0,100).map((kw: any, i: number) => (
                    <tr key={i} style={{ borderTop:'1px solid rgba(255,255,255,0.04)',background:i%2===0?'rgba(255,255,255,0.01)':'transparent' }}>
                      <td style={{ padding:'11px 16px',fontWeight:500,color:'rgba(255,255,255,0.85)' }}>{kw.keyword}</td>
                      <td style={{ padding:'11px 16px' }}>
                        <span style={{ fontSize:14,fontWeight:700,color:kw.position<=3?'#4ade80':kw.position<=10?'#fbbf24':'rgba(255,255,255,0.6)' }}>#{kw.position}</span>
                      </td>
                      <td style={{ padding:'11px 16px',fontWeight:600,color:'#4ade80' }}>{(kw.clicks||0).toLocaleString()}</td>
                      <td style={{ padding:'11px 16px',color:'rgba(255,255,255,0.55)' }}>{(kw.impressions||0).toLocaleString()}</td>
                      <td style={{ padding:'11px 16px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                          <div style={{ width:40,height:4,borderRadius:100,background:'rgba(255,255,255,0.06)',overflow:'hidden' }}>
                            <div style={{ height:'100%',width:`${Math.min(100,parseFloat(kw.ctr)*5)}%`,background:'#6366f1',borderRadius:100 }}/>
                          </div>
                          <span style={{ fontSize:12,color:'rgba(255,255,255,0.55)' }}>{kw.ctr}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ padding:'12px 16px',fontSize:12,color:'rgba(255,255,255,0.25)',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                Real data from Google Search Console · Last 28 days
              </p>
            </div>
          )}

          {/* PAGES */}
          {tab === 'pages' && (
            <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.04)' }}>
                    {['Page URL','Position','Clicks','Impressions','CTR'].map(h => (
                      <th key={h} style={{ textAlign:'left',padding:'12px 16px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pages.slice(0,50).map((p: any, i: number) => (
                    <tr key={i} style={{ borderTop:'1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding:'11px 16px',maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                        <a href={p.page} target="_blank" rel="noopener noreferrer" style={{ color:'#818cf8',textDecoration:'none',fontSize:12 }}>{p.page}</a>
                      </td>
                      <td style={{ padding:'11px 16px',fontWeight:700,color:p.position<=3?'#4ade80':p.position<=10?'#fbbf24':'rgba(255,255,255,0.6)' }}>#{p.position}</td>
                      <td style={{ padding:'11px 16px',fontWeight:600,color:'#4ade80' }}>{(p.clicks||0).toLocaleString()}</td>
                      <td style={{ padding:'11px 16px',color:'rgba(255,255,255,0.55)' }}>{(p.impressions||0).toLocaleString()}</td>
                      <td style={{ padding:'11px 16px',color:'rgba(255,255,255,0.55)' }}>{p.ctr}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TREND */}
          {tab === 'trend' && trend.length > 0 && (
            <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22 }}>
              <h3 style={{ fontSize:14,fontWeight:700,marginBottom:20 }}>Daily clicks — last 30 days</h3>
              <div style={{ display:'flex',alignItems:'flex-end',gap:4,height:140 }}>
                {trend.map((d: any, i: number) => {
                  const max = Math.max(...trend.map((t: any) => t.clicks), 1);
                  const h = Math.round((d.clicks / max) * 120);
                  return (
                    <div key={i} title={`${d.date}: ${d.clicks} clicks`} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                      <div style={{ width:'100%',height:h,background:'linear-gradient(180deg,#6366f1,#4338ca)',borderRadius:'4px 4px 0 0',minHeight:2,transition:'height 0.3s ease' }}/>
                      {i % 7 === 0 && <span style={{ fontSize:9,color:'rgba(255,255,255,0.3)',whiteSpace:'nowrap',transform:'rotate(-45deg)',transformOrigin:'center',display:'block' }}>{d.date?.slice(5)}</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',marginTop:16,padding:'14px 16px',background:'rgba(255,255,255,0.03)',borderRadius:10 }}>
                <span style={{ fontSize:13,color:'rgba(255,255,255,0.5)' }}>Total clicks: <strong style={{ color:'#4ade80' }}>{trend.reduce((s: number, d: any) => s + d.clicks, 0).toLocaleString()}</strong></span>
                <span style={{ fontSize:13,color:'rgba(255,255,255,0.5)' }}>Avg position: <strong style={{ color:'#818cf8' }}>#{Math.round(trend.reduce((s: number, d: any) => s + d.position, 0) / trend.length)}</strong></span>
                <span style={{ fontSize:13,color:'rgba(255,255,255,0.5)' }}>Total impressions: <strong style={{ color:'#fbbf24' }}>{trend.reduce((s: number, d: any) => s + d.impressions, 0).toLocaleString()}</strong></span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {status?.connected && keywords.length === 0 && !loading && (
        <div style={{ textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14 }}>
          <div style={{ fontSize:52,marginBottom:16 }}>📊</div>
          <h3 style={{ fontSize:17,fontWeight:700,marginBottom:10 }}>No data yet</h3>
          <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:24,lineHeight:1.6,maxWidth:400,margin:'0 auto 24px' }}>
            Select your website and GSC property above, then click "Sync Rankings" to pull your real Google data.
          </p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign:'center',padding:40 }}>
          <div style={{ width:32,height:32,border:'3px solid #6366f1',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ color:'rgba(255,255,255,0.3)',fontSize:13 }}>Loading Google data...</p>
        </div>
      )}
    </div>
  );
}

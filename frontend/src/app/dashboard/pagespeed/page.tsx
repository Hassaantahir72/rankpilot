'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function PageSpeedPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [view, setView] = useState<'mobile'|'desktop'>('mobile');
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const analyze = async () => {
    setLoading(true); setData(null);
    try {
      const r = await api.post('/features/pagespeed/analyze', { websiteId: selectedSite||undefined, url: customUrl||undefined });
      setData(r.data);
    } catch(e:any) { setMsg(e.response?.data?.error||'Analysis failed'); }
    setLoading(false);
  };

  const scoreColor = (s:number) => s>=90?'#4ade80':s>=70?'#a3e635':s>=50?'#fbbf24':s>=30?'#f97316':'#ef4444';
  const current = data?.[view];

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#f59e0b,#f97316)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚡</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Page Speed Optimizer</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Real Google PageSpeed scores with specific fixes — mobile & desktop</p>
        </div>
      </div>

      {msg && <div style={{marginBottom:18,padding:'12px 16px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:10,fontSize:13,color:'#fca5a5',display:'flex',justifyContent:'space-between'}}><span>{msg}</span><button onClick={()=>setMsg('')} style={{background:'none',border:'none',color:'inherit',cursor:'pointer'}}>✕</button></div>}

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:12,alignItems:'flex-end'}}>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Select Website</label>
            <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
              <option value="">Choose from your websites...</option>
              {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name} — {w.url}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Or Enter Any URL</label>
            <input className="input-dark" value={customUrl} onChange={e=>setCustomUrl(e.target.value)} placeholder="https://any-website.com"/>
          </div>
          <button onClick={analyze} disabled={loading||(!selectedSite&&!customUrl)} className="btn-primary" style={{padding:'11px 24px',fontSize:14,whiteSpace:'nowrap'}}>
            {loading?'⏳ Analyzing...':'⚡ Analyze Speed'}
          </button>
        </div>
        <p style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:12}}>Powered by Google PageSpeed Insights API — same tool Google uses to rank your site</p>
      </div>

      {data && <>
        {/* Grade */}
        {data.overallGrade && (
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:24,marginBottom:20,display:'flex',alignItems:'center',gap:24,flexWrap:'wrap'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:`rgba(0,0,0,0.3)`,border:`4px solid ${data.overallGrade.color}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <span style={{fontSize:32,fontWeight:900,color:data.overallGrade.color,lineHeight:1}}>{data.overallGrade.grade}</span>
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:20,fontWeight:800,color:data.overallGrade.color,marginBottom:6}}>{data.overallGrade.label}</p>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>{data.estimatedRevenueLoss||'Great page speed! Keep maintaining these scores.'}</p>
            </div>
          </div>
        )}

        {/* Mobile/Desktop toggle */}
        <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:20,width:'fit-content'}}>
          {(['mobile','desktop'] as const).map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{padding:'8px 20px',borderRadius:9,border:'none',background:view===v?'rgba(255,255,255,0.1)':'transparent',color:view===v?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:view===v?600:400,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize'}}>
              {v==='mobile'?'📱 Mobile':'🖥️ Desktop'}
            </button>
          ))}
        </div>

        {current && <>
          {/* Scores */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
            {[
              {label:'Performance',value:current.scores?.performance},
              {label:'SEO',value:current.scores?.seo},
              {label:'Accessibility',value:current.scores?.accessibility},
              {label:'Best Practices',value:current.scores?.bestPractices},
            ].map(s=>(
              <div key={s.label} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,textAlign:'center'}}>
                <div style={{fontSize:32,fontWeight:900,color:scoreColor(s.value||0),fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:4}}>{s.value??'—'}</div>
                <div style={{width:'100%',height:4,background:'rgba(255,255,255,0.06)',borderRadius:100,marginBottom:8}}><div style={{height:'100%',width:`${s.value||0}%`,background:scoreColor(s.value||0),borderRadius:100,transition:'width 0.6s ease'}}/></div>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Core Web Vitals */}
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:20,marginBottom:20}}>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:16}}>Core Web Vitals</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
              {Object.values(current.coreWebVitals||{}).map((v:any,i:number)=>(
                <div key={i} style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14,textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:800,color:scoreColor(v.score),marginBottom:4}}>{v.value}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{v.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Issues to fix */}
          {current.opportunities?.length > 0 && (
            <div>
              <h3 style={{fontSize:14,fontWeight:700,marginBottom:14}}>🔧 Issues to Fix ({current.totalIssues})</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {current.opportunities.map((op:any,i:number)=>(
                  <div key={i} style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${op.impact==='high'?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.07)'}`,borderRadius:12,padding:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:op.impact==='high'?'rgba(239,68,68,0.1)':'rgba(251,191,36,0.1)',color:op.impact==='high'?'#f87171':'#fbbf24',fontWeight:700}}>{op.impact} impact</span>
                        <span style={{fontWeight:600,fontSize:14}}>{op.title}</span>
                      </div>
                      {op.savings && <span style={{fontSize:12,color:'#4ade80',fontWeight:600}}>{op.savings}</span>}
                    </div>
                    <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.6,marginBottom:8}}>{op.description}</p>
                    <div style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:8,padding:10}}>
                      <p style={{fontSize:12,color:'#818cf8',fontWeight:600}}>✅ Fix: {op.fix}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>}
      </>}

      {!data && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>⚡</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Test Your Page Speed</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>Get real Google PageSpeed scores with specific, actionable fixes. Every 1 second of delay costs 7% in conversions.</p>
        </div>
      )}
    </div>
  );
}

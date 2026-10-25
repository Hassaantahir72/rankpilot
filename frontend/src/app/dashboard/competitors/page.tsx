'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function CompetitorsPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [competitorUrls, setCompetitorUrls] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok');

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const track = async () => {
    if (!selectedSite) { showMsg('Select a website','err'); return; }
    setLoading(true);
    try {
      const urls = competitorUrls.split('\n').map(u=>u.trim()).filter(Boolean);
      const r = await api.post('/features/competitors/track', { websiteId: selectedSite, competitorUrls: urls });
      setData(r.data.competitors||[]);
      if (r.data.competitors?.length) {
        const website = websites.find(w=>w.id===selectedSite);
        const rep = await api.post('/features/competitors/report', { yourDomain: website?.url, competitors: r.data.competitors });
        setReport(rep.data);
      }
      showMsg(`Tracked ${r.data.tracked} competitors!`,'ok');
    } catch(e:any) { showMsg(e.response?.data?.error||'Failed','err'); }
    setLoading(false);
  };

  const showMsg = (t:string,type:'ok'|'err'='ok') => { setMsg(t); setMsgType(type); setTimeout(()=>setMsg(''),5000); };

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#ef4444,#f97316)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🕵️</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Competitor Tracking</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Monitor competitors weekly — detect changes, keywords, content strategy</p>
        </div>
      </div>

      {msg && <div style={{marginBottom:18,padding:'12px 16px',background:msgType==='err'?'rgba(239,68,68,0.08)':'rgba(74,222,128,0.08)',border:`1px solid ${msgType==='err'?'rgba(239,68,68,0.25)':'rgba(74,222,128,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='err'?'#fca5a5':'#4ade80',display:'flex',justifyContent:'space-between'}}><span>{msg}</span><button onClick={()=>setMsg('')} style={{background:'none',border:'none',color:'inherit',cursor:'pointer'}}>✕</button></div>}

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Your Website</label>
            <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
              <option value="">Choose...</option>
              {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Competitor URLs (one per line, max 5)</label>
            <textarea className="input-dark" value={competitorUrls} onChange={e=>setCompetitorUrls(e.target.value)} placeholder={'https://competitor1.com\nhttps://competitor2.com\nhttps://competitor3.com'} style={{height:100,resize:'vertical',fontSize:12,fontFamily:'monospace'}}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <button onClick={track} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 26px',fontSize:14}}>
            {loading?'⏳ Tracking...':'🕵️ Track Competitors'}
          </button>
        </div>
      </div>

      {report && (
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:20}}>
          <h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>📊 Competitor Intelligence Report</h3>
          {report.insights?.map((ins:string,i:number)=>(
            <div key={i} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <span style={{color:'#fbbf24',flexShrink:0}}>💡</span>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>{ins}</p>
            </div>
          ))}
          {report.recommendations?.map((rec:any,i:number)=>(
            <div key={i} style={{background:rec.priority==='high'?'rgba(239,68,68,0.06)':'rgba(99,102,241,0.06)',border:`1px solid ${rec.priority==='high'?'rgba(239,68,68,0.2)':'rgba(99,102,241,0.2)'}`,borderRadius:10,padding:14,marginTop:10}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:5}}>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:rec.priority==='high'?'rgba(239,68,68,0.15)':'rgba(99,102,241,0.15)',color:rec.priority==='high'?'#f87171':'#818cf8',fontWeight:700}}>{rec.priority} priority</span>
                <p style={{fontWeight:700,fontSize:14}}>{rec.action}</p>
              </div>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{rec.reason}</p>
            </div>
          ))}
        </div>
      )}

      {data.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:16}}>
          {data.map((comp:any,i:number)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                <div>
                  <a href={`https://${comp.domain}`} target="_blank" rel="noopener noreferrer" style={{fontWeight:700,fontSize:15,color:'#818cf8',textDecoration:'none'}}>{comp.domain}</a>
                  <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:2}}>Last checked: {comp.lastChecked?.slice(0,10)||'just now'}</p>
                </div>
                <span style={{fontSize:11,padding:'3px 10px',borderRadius:100,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)'}}>DA ~{comp.estimatedDA||'?'}</span>
              </div>
              {comp.error ? (
                <p style={{fontSize:12,color:'#f87171'}}>⚠️ Could not fetch: {comp.error}</p>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {comp.title && <div style={{display:'flex',gap:8}}><span style={{fontSize:11,color:'rgba(255,255,255,0.3)',minWidth:32,flexShrink:0}}>Title</span><p style={{fontSize:12,color:'rgba(255,255,255,0.65)'}}>{comp.title?.slice(0,60)}</p></div>}
                  {comp.h1 && <div style={{display:'flex',gap:8}}><span style={{fontSize:11,color:'rgba(255,255,255,0.3)',minWidth:32,flexShrink:0}}>H1</span><p style={{fontSize:12,color:'rgba(255,255,255,0.65)'}}>{comp.h1?.slice(0,60)}</p></div>}
                  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:4}}>
                    {comp.hasSchema&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(74,222,128,0.1)',color:'#4ade80'}}>Has Schema ✓</span>}
                    {comp.hasBlog&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(99,102,241,0.1)',color:'#818cf8'}}>Has Blog ✓</span>}
                    {comp.wordCount&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)'}}>{comp.wordCount} words</span>}
                  </div>
                  {comp.topKeywords?.slice(0,4)?.length>0 && (
                    <div style={{marginTop:6}}>
                      <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:5}}>Top keywords:</p>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {comp.topKeywords.slice(0,4).map((k:any,j:number)=>(
                          <span key={j} style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(245,158,11,0.1)',color:'#fbbf24'}}>{k.keyword}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!data.length && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>🕵️</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Track Your Competitors</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>Enter up to 5 competitor URLs. We'll analyse their SEO, content strategy, keywords and detect any changes they make — giving you the intelligence to stay ahead.</p>
        </div>
      )}
    </div>
  );
}

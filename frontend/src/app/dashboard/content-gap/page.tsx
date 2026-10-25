'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function ContentGapPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'quick'|'high'|'all'>('quick');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok');

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const analyze = async () => {
    if (!selectedSite) { showMsg('Select a website first','err'); return; }
    setLoading(true); setData(null);
    try {
      const compList = competitors.split('\n').map(c=>c.trim()).filter(Boolean);
      const r = await api.post('/features/content-gap', { websiteId: selectedSite, competitors: compList });
      setData(r.data);
      showMsg(`Found ${r.data.totalGaps} keyword gaps!`,'ok');
    } catch(e:any) { showMsg(e.response?.data?.error||'Analysis failed','err'); }
    setLoading(false);
  };

  const showMsg = (t:string,type:'ok'|'err'='ok') => { setMsg(t); setMsgType(type); setTimeout(()=>setMsg(''),6000); };
  const intentColor = (i:string) => i==='transactional'?'#4ade80':i==='commercial'?'#fbbf24':i==='informational'?'#60a5fa':'rgba(255,255,255,0.5)';

  const gaps = tab==='quick'?data?.quickWins:tab==='high'?data?.highValue:data?.allGaps;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#f59e0b,#ef4444)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🎯</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Content Gap Analysis</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Find keywords your competitors rank for that you don't — your biggest traffic opportunities</p>
        </div>
      </div>

      {msg && <div style={{marginBottom:18,padding:'12px 16px',background:msgType==='err'?'rgba(239,68,68,0.08)':'rgba(74,222,128,0.08)',border:`1px solid ${msgType==='err'?'rgba(239,68,68,0.25)':'rgba(74,222,128,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='err'?'#fca5a5':'#4ade80',display:'flex',justifyContent:'space-between'}}><span>{msg}</span><button onClick={()=>setMsg('')} style={{background:'none',border:'none',color:'inherit',cursor:'pointer'}}>✕</button></div>}

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Your Website</label>
            <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
              <option value="">Choose website...</option>
              {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Competitor URLs (one per line)</label>
            <textarea className="input-dark" value={competitors} onChange={e=>setCompetitors(e.target.value)} placeholder={'competitor1.com\ncompetitor2.com\ncompetitor3.com'} style={{height:90,resize:'vertical',fontSize:12,fontFamily:'monospace'}}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>Leave competitors blank to analyze vs industry keywords only</p>
          <button onClick={analyze} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 26px',fontSize:14}}>
            {loading?'⏳ Analyzing...':'🎯 Find Content Gaps'}
          </button>
        </div>
      </div>

      {data && <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14,marginBottom:24}}>
          {[
            {label:'Total Gaps Found',value:data.totalGaps,color:'#f59e0b',icon:'🎯'},
            {label:'Quick Wins',value:data.quickWins?.length,color:'#4ade80',icon:'⚡'},
            {label:'High Value',value:data.highValue?.length,color:'#6366f1',icon:'💰'},
            {label:'Est. Traffic Gain',value:`+${data.summary?.estimatedTrafficGain?.toLocaleString()||0}`,color:'#60a5fa',icon:'📈'},
          ].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,textAlign:'center'}}>
              <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
              <div style={{fontSize:24,fontWeight:900,color:s.color,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{s.value}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>

        {data.summary?.topOpportunity && (
          <div style={{background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:12,padding:16,marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <div>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:4}}>TOP OPPORTUNITY</p>
              <p style={{fontSize:16,fontWeight:700,color:'#fbbf24'}}>"{data.summary.topOpportunity}"</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:4}}>EASIEST WIN</p>
              <p style={{fontSize:16,fontWeight:700,color:'#4ade80'}}>"{data.summary.easiestWin}"</p>
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:20,width:'fit-content'}}>
          {[{id:'quick',label:'⚡ Quick Wins',count:data.quickWins?.length},{id:'high',label:'💰 High Value',count:data.highValue?.length},{id:'all',label:'📋 All Gaps',count:data.allGaps?.length}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)} style={{padding:'8px 16px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit'}}>
              {t.label} <span style={{fontSize:11,opacity:.6}}>({t.count})</span>
            </button>
          ))}
        </div>

        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{background:'rgba(255,255,255,0.04)'}}>
              {['Keyword','Search Volume','Difficulty','Intent','Competitors Have It','Action'].map(h=><th key={h} style={{textAlign:'left',padding:'11px 14px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(gaps||[]).map((g:any,i:number)=>(
                <tr key={i} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                  <td style={{padding:'11px 14px',fontWeight:600,color:'rgba(255,255,255,0.85)'}}>{g.keyword}</td>
                  <td style={{padding:'11px 14px',color:'#4ade80',fontWeight:700}}>{g.searchVolume?.toLocaleString()}</td>
                  <td style={{padding:'11px 14px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:40,height:4,background:'rgba(255,255,255,0.06)',borderRadius:100}}><div style={{height:'100%',width:`${g.difficulty}%`,background:g.difficulty<40?'#4ade80':g.difficulty<70?'#fbbf24':'#f87171',borderRadius:100}}/></div>
                      <span style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{g.difficulty}</span>
                    </div>
                  </td>
                  <td style={{padding:'11px 14px'}}><span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:`rgba(0,0,0,0.2)`,color:intentColor(g.intent),fontWeight:600,textTransform:'capitalize'}}>{g.intent}</span></td>
                  <td style={{padding:'11px 14px',color:'#f87171',fontWeight:700}}>{g.competitorCount} competitors</td>
                  <td style={{padding:'11px 14px',fontSize:11,color:'rgba(255,255,255,0.5)',maxWidth:200}}>{g.action}</td>
                </tr>
              ))}
              {!gaps?.length && <tr><td colSpan={6} style={{padding:40,textAlign:'center',color:'rgba(255,255,255,0.3)'}}>No gaps found in this category.</td></tr>}
            </tbody>
          </table>
        </div>
      </>}

      {!data && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>🎯</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Find Your Content Gaps</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>Enter your competitors' websites and we'll find every keyword they rank for that you don't. These are your biggest traffic opportunities.</p>
        </div>
      )}
    </div>
  );
}

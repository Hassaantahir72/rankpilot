'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function CannibalizationPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<number|null>(null);

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const detect = async () => {
    if (!selectedSite) return;
    setLoading(true); setData(null);
    try { const r = await api.post('/features/cannibalization/detect', { websiteId: selectedSite }); setData(r.data); }
    catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const sevColor = (s:string) => s==='critical'?'#f87171':s==='high'?'#f97316':s==='medium'?'#fbbf24':'#60a5fa';
  const sevBg = (s:string) => s==='critical'?'rgba(239,68,68,0.08)':s==='high'?'rgba(249,115,22,0.08)':s==='medium'?'rgba(251,191,36,0.08)':'rgba(96,165,250,0.08)';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#ef4444,#dc2626)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚔️</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Keyword Cannibalization Detector</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Find pages competing for the same keyword — they split traffic and hurt your rankings</p>
        </div>
      </div>

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24,display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Select Website</label>
          <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
            <option value="">Choose website...</option>
            {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name} — {w.url}</option>)}
          </select>
        </div>
        <button onClick={detect} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 24px',fontSize:14}}>
          {loading?'⏳ Detecting...':'⚔️ Detect Cannibalization'}
        </button>
      </div>

      {data && <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
          {[
            {l:'Pages Analyzed',v:data.pagesAnalyzed,c:'#6366f1'},
            {l:'Issues Found',v:data.summary?.total,c:data.summary?.total>0?'#f87171':'#4ade80'},
            {l:'Critical',v:data.summary?.critical,c:'#f87171'},
            {l:'High Priority',v:data.summary?.high,c:'#f97316'},
          ].map(s=>(
            <div key={s.l} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,textAlign:'center'}}>
              <div style={{fontSize:26,fontWeight:900,color:s.c,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:4}}>{s.v??0}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {data.summary?.estimatedTrafficLoss && (
          <div style={{background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:12,padding:14,marginBottom:20}}>
            <p style={{fontSize:13,color:'#f87171'}}>⚠️ {data.summary.estimatedTrafficLoss}</p>
          </div>
        )}

        {data.recommendations?.length > 0 && (
          <div style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:12,padding:16,marginBottom:20}}>
            <p style={{fontSize:13,fontWeight:600,color:'#818cf8',marginBottom:8}}>How to fix:</p>
            {data.recommendations.map((r:string,i:number)=>(
              <div key={i} style={{display:'flex',gap:8,padding:'5px 0'}}>
                <span style={{color:'#818cf8',flexShrink:0}}>{i+1}.</span>
                <p style={{fontSize:13,color:'rgba(255,255,255,0.6)'}}>{r}</p>
              </div>
            ))}
          </div>
        )}

        {data.issues?.length > 0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {data.issues.map((issue:any,i:number)=>(
              <div key={i} style={{background:sevBg(issue.severity),border:`1px solid ${sevColor(issue.severity)}33`,borderRadius:14,overflow:'hidden'}}>
                <div onClick={()=>setExpanded(expanded===i?null:i)} style={{padding:'16px 20px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:`rgba(0,0,0,0.2)`,color:sevColor(issue.severity),fontWeight:700,textTransform:'capitalize'}}>{issue.severity}</span>
                      <span style={{fontWeight:600,fontSize:14,color:'rgba(255,255,255,0.85)'}}>{issue.sharedKeywords?.slice(0,3).join(', ')}</span>
                    </div>
                    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                      {issue.pages?.map((p:any,j:number)=>(
                        <span key={j} style={{fontSize:12,padding:'2px 10px',borderRadius:100,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.6)'}}>{p.title?.slice(0,35)||p.url}</span>
                      ))}
                    </div>
                  </div>
                  <span style={{color:'rgba(255,255,255,0.3)',fontSize:18,marginLeft:12}}>{expanded===i?'▲':'▼'}</span>
                </div>

                {expanded===i && (
                  <div style={{borderTop:`1px solid ${sevColor(issue.severity)}22`,padding:'16px 20px',background:'rgba(0,0,0,0.15)'}}>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.6,marginBottom:16}}>{issue.problem}</p>

                    <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                      <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Shared keywords ({issue.sharedKeywords?.length}):</span>
                      {issue.sharedKeywords?.map((k:string,j:number)=>(
                        <span key={j} style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(239,68,68,0.1)',color:'#f87171'}}>{k}</span>
                      ))}
                    </div>

                    <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginBottom:10}}>Content similarity: {issue.contentSimilarity}%</p>

                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <p style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)',marginBottom:4}}>Fix options:</p>
                      {['option1','option2','option3'].map((opt:string)=>{
                        const o = issue.fix?.[opt];
                        if (!o) return null;
                        return (
                          <div key={opt} style={{background:issue.fix?.recommended===opt?'rgba(74,222,128,0.08)':'rgba(255,255,255,0.03)',border:`1px solid ${issue.fix?.recommended===opt?'rgba(74,222,128,0.25)':'rgba(255,255,255,0.06)'}`,borderRadius:9,padding:12}}>
                            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:4}}>
                              {issue.fix?.recommended===opt&&<span style={{fontSize:10,padding:'1px 7px',borderRadius:100,background:'rgba(74,222,128,0.15)',color:'#4ade80',fontWeight:700}}>RECOMMENDED</span>}
                              <p style={{fontWeight:600,fontSize:13,color:'rgba(255,255,255,0.85)'}}>{o.action}</p>
                            </div>
                            <p style={{fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>{o.detail}</p>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{fontSize:11,color:issue.fix?.effort==='medium'?'#fbbf24':'#4ade80',marginTop:10}}>Effort: {issue.fix?.effort}</p>
                    <p style={{fontSize:12,color:'#4ade80',marginTop:4}}>💰 {issue.estimatedImpact}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : data.pagesAnalyzed > 0 && (
          <div style={{background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:14,padding:32,textAlign:'center'}}>
            <div style={{fontSize:42,marginBottom:12}}>✅</div>
            <h3 style={{fontSize:16,fontWeight:700,color:'#4ade80',marginBottom:8}}>No Cannibalization Detected!</h3>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Your pages target different keywords — great SEO hygiene.</p>
          </div>
        )}
      </>}

      {!data && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>⚔️</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Detect Keyword Cannibalization</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>When two pages target the same keyword, they compete against each other and split traffic. This hidden problem can cost you 20-40% of potential rankings.</p>
        </div>
      )}
    </div>
  );
}

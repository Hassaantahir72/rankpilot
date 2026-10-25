'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function InternalLinksPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'opportunities'|'ai'|'pages'>('opportunities');

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const analyze = async () => {
    if (!selectedSite) return;
    setLoading(true); setData(null);
    try { const r = await api.post('/features/internal-links/analyze', { websiteId: selectedSite }); setData(r.data); }
    catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const priorityColor = (p:string) => p==='high'?'#f87171':p==='medium'?'#fbbf24':'#60a5fa';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#8b5cf6,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🔀</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Internal Linking Optimizer</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Find opportunities to link between your pages — boosts page authority by 10-25%</p>
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
        <button onClick={analyze} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 24px',fontSize:14}}>
          {loading?'⏳ Crawling pages...':'🔀 Find Link Opportunities'}
        </button>
      </div>

      {data && <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
          {[
            {l:'Pages Analyzed',v:data.pagesAnalyzed,c:'#6366f1'},
            {l:'Opportunities',v:data.summary?.total,c:'#fbbf24'},
            {l:'High Priority',v:data.summary?.high,c:'#f87171'},
            {l:'Medium Priority',v:data.summary?.medium,c:'#60a5fa'},
          ].map(s=>(
            <div key={s.l} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,textAlign:'center'}}>
              <div style={{fontSize:26,fontWeight:900,color:s.c,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:4}}>{s.v??'—'}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {data.summary?.estimatedSEOGain && (
          <div style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:12,padding:14,marginBottom:20}}>
            <p style={{fontSize:13,color:'#818cf8'}}>💡 {data.summary.estimatedSEOGain}</p>
          </div>
        )}

        <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:20,width:'fit-content'}}>
          {[{id:'opportunities',l:'🔗 Opportunities'},{id:'ai',l:'🤖 AI Suggestions'},{id:'pages',l:'📄 Pages'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)} style={{padding:'8px 16px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit'}}>
              {t.l}
            </button>
          ))}
        </div>

        {tab==='opportunities' && (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {(data.opportunities||[]).map((op:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${op.priority==='high'?'rgba(239,68,68,0.2)':'rgba(255,255,255,0.07)'}`,borderRadius:12,padding:18}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:`rgba(0,0,0,0.2)`,color:priorityColor(op.priority),fontWeight:700,textTransform:'capitalize'}}>{op.priority}</span>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>Add link from</span>
                  <span style={{fontWeight:700,color:'#818cf8',fontSize:13}}>{op.sourcePage?.title||op.sourcePage?.url}</span>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>→ to →</span>
                  <span style={{fontWeight:700,color:'#4ade80',fontSize:13}}>{op.targetPage?.title||op.targetPage?.url}</span>
                </div>
                <div style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:8,padding:10,marginBottom:8}}>
                  <p style={{fontSize:12,color:'#818cf8'}}>Suggested anchor text: <strong>"{op.suggestedAnchorText}"</strong></p>
                </div>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>{op.implementation}</p>
              </div>
            ))}
            {!data.opportunities?.length && <p style={{textAlign:'center',padding:40,color:'rgba(255,255,255,0.3)',fontSize:13}}>No linking opportunities found. Your internal linking may already be well optimised!</p>}
          </div>
        )}

        {tab==='ai' && (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {(data.aiSuggestions||[]).map((s:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:16}}>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:6}}>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>From:</span><strong style={{fontSize:13}}>{s.from}</strong>
                  <span style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>→ To:</span><strong style={{fontSize:13,color:'#4ade80'}}>{s.to}</strong>
                </div>
                <p style={{fontSize:12,color:'#818cf8',marginBottom:4}}>Anchor: "{s.anchorText}"</p>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{s.reason}</p>
              </div>
            ))}
            {!data.aiSuggestions?.length && <p style={{textAlign:'center',padding:40,color:'rgba(255,255,255,0.3)',fontSize:13}}>No AI suggestions generated. Try connecting Groq API.</p>}
          </div>
        )}

        {tab==='pages' && (
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{background:'rgba(255,255,255,0.04)'}}>
                {['Page','Title','Word Count','Internal Links'].map(h=><th key={h} style={{textAlign:'left',padding:'11px 14px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(data.pages||[]).map((p:any,i:number)=>(
                  <tr key={i} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                    <td style={{padding:'10px 14px',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}><a href={p.url} target="_blank" rel="noopener noreferrer" style={{color:'#818cf8',textDecoration:'none',fontSize:12}}>{p.url}</a></td>
                    <td style={{padding:'10px 14px',color:'rgba(255,255,255,0.65)',fontSize:12}}>{p.title?.slice(0,50)||'—'}</td>
                    <td style={{padding:'10px 14px',color:'rgba(255,255,255,0.5)'}}>{p.wordCount}</td>
                    <td style={{padding:'10px 14px'}}><span style={{padding:'2px 10px',borderRadius:100,background:'rgba(99,102,241,0.1)',color:'#818cf8',fontSize:12,fontWeight:600}}>{p.existingInternalLinks}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>}

      {!data && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>🔀</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Optimize Internal Linking</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>We crawl all your pages and find where you should add links between them — with exact anchor text suggestions. Internal links spread page authority and help Google understand your site structure.</p>
        </div>
      )}
    </div>
  );
}

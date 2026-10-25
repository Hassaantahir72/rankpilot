'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function BacklinksPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok');
  const [tab, setTab] = useState<'backlinks'|'opportunities'>('backlinks');

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const analyze = async () => {
    if (!selectedSite) { showMsg('Select a website first','err'); return; }
    setLoading(true); setData(null);
    try {
      const r = await api.post('/features/backlinks/analyze', { websiteId: selectedSite });
      setData(r.data);
      showMsg('Backlink analysis complete!','ok');
    } catch(e:any) { showMsg(e.response?.data?.error||'Analysis failed','err'); }
    setLoading(false);
  };

  const showMsg = (t:string,type:'ok'|'err'='ok') => { setMsg(t); setMsgType(type); setTimeout(()=>setMsg(''),6000); };

  const qualityColor = (q:string) => q==='excellent'?'#4ade80':q==='good'?'#60a5fa':q==='toxic'?'#f87171':'#fbbf24';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🔗</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Backlink Analyzer</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Discover who links to you, your domain authority, and link-building opportunities</p>
        </div>
      </div>

      {msg && <div style={{marginBottom:18,padding:'12px 16px',background:msgType==='err'?'rgba(239,68,68,0.08)':'rgba(74,222,128,0.08)',border:`1px solid ${msgType==='err'?'rgba(239,68,68,0.25)':'rgba(74,222,128,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='err'?'#fca5a5':'#4ade80',display:'flex',justifyContent:'space-between'}}><span>{msg}</span><button onClick={()=>setMsg('')} style={{background:'none',border:'none',color:'inherit',cursor:'pointer'}}>✕</button></div>}

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24,display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Select Website</label>
          <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
            <option value="">Choose website...</option>
            {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name} — {w.url}</option>)}
          </select>
        </div>
        <button onClick={analyze} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 26px',fontSize:14,whiteSpace:'nowrap'}}>
          {loading?'⏳ Analyzing...':'🔍 Analyze Backlinks'}
        </button>
      </div>

      {data && <>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:14,marginBottom:24}}>
          {[
            {label:'Domain Authority',value:data.analysis?.domainAuthority,color:'#6366f1',icon:'⭐'},
            {label:'Total Backlinks',value:data.analysis?.totalBacklinks,color:'#4ade80',icon:'🔗'},
            {label:'Unique Domains',value:data.analysis?.uniqueDomains,color:'#60a5fa',icon:'🌐'},
            {label:'Toxic Links',value:data.analysis?.toxicLinks,color:'#f87171',icon:'☠️'},
            {label:'Avg Referring DA',value:data.analysis?.avgReferringDA,color:'#fbbf24',icon:'📊'},
          ].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,textAlign:'center'}}>
              <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
              <div style={{fontSize:26,fontWeight:900,color:s.color,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{s.value??'—'}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {data.analysis?.summary && (
          <div style={{background:`rgba(${data.analysis.summary.health==='good'?'74,222,128':data.analysis.summary.health==='fair'?'251,191,36':'239,68,68'},0.06)`,border:`1px solid rgba(${data.analysis.summary.health==='good'?'74,222,128':data.analysis.summary.health==='fair'?'251,191,36':'239,68,68'},0.2)`,borderRadius:12,padding:16,marginBottom:20}}>
            <p style={{fontSize:14,fontWeight:600,marginBottom:4,color:data.analysis.summary.health==='good'?'#4ade80':data.analysis.summary.health==='fair'?'#fbbf24':'#f87171'}}>
              Backlink Health: {data.analysis.summary.health?.toUpperCase()}
            </p>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.6}}>{data.analysis.summary.recommendation}</p>
          </div>
        )}

        {/* Tabs */}
        <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:20,width:'fit-content'}}>
          {(['backlinks','opportunities'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 18px',borderRadius:9,border:'none',background:tab===t?'rgba(255,255,255,0.1)':'transparent',color:tab===t?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t?600:400,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize'}}>
              {t==='backlinks'?'🔗 Backlinks':'💡 Link Opportunities'}
            </button>
          ))}
        </div>

        {tab==='backlinks' && (
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{background:'rgba(255,255,255,0.04)'}}>
                {['Domain','Domain Authority','Quality','Type','Last Seen'].map(h=><th key={h} style={{textAlign:'left',padding:'11px 16px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(data.analysis?.backlinks||[]).map((bl:any,i:number)=>(
                  <tr key={i} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                    <td style={{padding:'11px 16px'}}><a href={`https://${bl.domain}`} target="_blank" rel="noopener noreferrer" style={{color:'#818cf8',textDecoration:'none',fontWeight:500}}>{bl.domain}</a></td>
                    <td style={{padding:'11px 16px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:50,height:5,background:'rgba(255,255,255,0.06)',borderRadius:100}}><div style={{height:'100%',width:`${bl.domainAuthority}%`,background:bl.domainAuthority>=70?'#4ade80':bl.domainAuthority>=40?'#fbbf24':'#f87171',borderRadius:100}}/></div>
                        <span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{bl.domainAuthority}</span>
                      </div>
                    </td>
                    <td style={{padding:'11px 16px'}}><span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:`rgba(${bl.quality==='excellent'?'74,222,128':bl.quality==='good'?'96,165,250':bl.quality==='toxic'?'239,68,68':'251,191,36'},0.1)`,color:qualityColor(bl.quality),fontWeight:600,textTransform:'capitalize'}}>{bl.quality}</span></td>
                    <td style={{padding:'11px 16px',color:'rgba(255,255,255,0.5)',fontSize:12}}>{bl.type}</td>
                    <td style={{padding:'11px 16px',color:'rgba(255,255,255,0.3)',fontSize:11}}>{bl.lastSeen?.slice(0,8)||'—'}</td>
                  </tr>
                ))}
                {!data.analysis?.backlinks?.length && <tr><td colSpan={5} style={{padding:40,textAlign:'center',color:'rgba(255,255,255,0.3)'}}>No backlinks found yet. Your site may be new or not indexed in CommonCrawl yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab==='opportunities' && (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {(data.opportunities||[]).map((op:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                    <p style={{fontWeight:700,fontSize:14}}>{op.name}</p>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:op.priority==='critical'?'rgba(239,68,68,0.1)':op.priority==='high'?'rgba(99,102,241,0.1)':'rgba(255,255,255,0.05)',color:op.priority==='critical'?'#f87171':op.priority==='high'?'#818cf8':'rgba(255,255,255,0.5)',fontWeight:600,textTransform:'capitalize'}}>{op.priority}</span>
                    <span style={{fontSize:11,color:'#4ade80',fontWeight:600}}>DA {op.da}</span>
                    {op.free&&<span style={{fontSize:11,color:'#4ade80',fontWeight:600}}>FREE</span>}
                  </div>
                  <p style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{op.description}</p>
                </div>
                <a href={`https://${op.url}`} target="_blank" rel="noopener noreferrer" style={{padding:'8px 16px',background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:8,color:'#818cf8',fontSize:12,fontWeight:600,textDecoration:'none',whiteSpace:'nowrap'}}>
                  Get Listed →
                </a>
              </div>
            ))}
          </div>
        )}
      </>}

      {!data && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>🔗</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Analyze Your Backlinks</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:400,margin:'0 auto'}}>Discover who links to your website, check your domain authority, find toxic links, and see where to get new high-quality backlinks.</p>
        </div>
      )}
    </div>
  );
}

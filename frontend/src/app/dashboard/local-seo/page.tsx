'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function LocalSEOPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [form, setForm] = useState({ businessName:'', phone:'', address:'', city:'', country:'GB' });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'gbp'|'nap'|'citations'|'keywords'>('gbp');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok');

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const analyze = async () => {
    if (!selectedSite) { showMsg('Select a website first','err'); return; }
    setLoading(true); setData(null);
    try {
      const r = await api.post('/features/local-seo/analyze', { websiteId: selectedSite, ...form });
      setData(r.data);
      showMsg('Local SEO analysis complete!','ok');
    } catch(e:any) { showMsg(e.response?.data?.error||'Failed','err'); }
    setLoading(false);
  };

  const showMsg = (t:string,type:'ok'|'err'='ok') => { setMsg(t); setMsgType(type); setTimeout(()=>setMsg(''),5000); };

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📍</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Local SEO Module</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Optimise for local search — Google Maps, citations, NAP consistency, local keywords</p>
        </div>
      </div>

      {msg && <div style={{marginBottom:18,padding:'12px 16px',background:msgType==='err'?'rgba(239,68,68,0.08)':'rgba(74,222,128,0.08)',border:`1px solid ${msgType==='err'?'rgba(239,68,68,0.25)':'rgba(74,222,128,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='err'?'#fca5a5':'#4ade80',display:'flex',justifyContent:'space-between'}}><span>{msg}</span><button onClick={()=>setMsg('')} style={{background:'none',border:'none',color:'inherit',cursor:'pointer'}}>✕</button></div>}

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:14}}>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Website</label>
            <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
              <option value="">Choose...</option>
              {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Business Name</label>
            <input className="input-dark" value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="e.g. Smith Plumbing Ltd"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>City / Area</label>
            <input className="input-dark" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="e.g. Manchester"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Phone Number</label>
            <input className="input-dark" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="e.g. 0161 123 4567"/>
          </div>
          <div style={{gridColumn:'span 2'}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Address</label>
            <input className="input-dark" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="e.g. 123 High Street, Manchester, M1 1AA"/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <button onClick={analyze} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 26px',fontSize:14}}>
            {loading?'⏳ Analysing...':'📍 Analyse Local SEO'}
          </button>
        </div>
      </div>

      {data && <>
        <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:20,width:'fit-content',flexWrap:'wrap'}}>
          {[{id:'gbp',label:'🗺 Google Business'},{id:'nap',label:'📋 NAP Consistency'},{id:'citations',label:'📌 Citations'},{id:'keywords',label:'🔑 Local Keywords'}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)} style={{padding:'8px 14px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit'}}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==='gbp' && (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:12,padding:16,marginBottom:8}}>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.6}}>Go through this Google Business Profile checklist — completing all items can increase local visibility by 40-60%.</p>
            </div>
            {data.googleBusinessProfile?.recommendations?.map((r:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:11,padding:16,display:'flex',gap:12,alignItems:'flex-start'}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>✓</div>
                <div>
                  <p style={{fontWeight:600,fontSize:14,marginBottom:4}}>{r.item}</p>
                  <p style={{fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>{r.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='nap' && (
          <div>
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:18,marginBottom:16}}>
              <p style={{fontSize:13,fontWeight:600,marginBottom:8}}>Your NAP Details to keep consistent:</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {[['Business Name',data.napConsistency?.businessName],['Phone',data.napConsistency?.phone],['Address',data.napConsistency?.address]].map(([l,v])=>(
                  <div key={l as string} style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:12}}>
                    <p style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{l}</p>
                    <p style={{fontSize:13,fontWeight:600,color:v?'rgba(255,255,255,0.85)':'rgba(255,255,255,0.25)'}}>{(v as string)||'Not provided'}</p>
                  </div>
                ))}
              </div>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:12,lineHeight:1.6}}>{data.napConsistency?.importance}</p>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {data.napConsistency?.directories?.map((d:any,i:number)=>(
                <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                  <div>
                    <span style={{fontWeight:600,fontSize:14,marginRight:10}}>{d.name}</span>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:d.priority==='critical'?'rgba(239,68,68,0.1)':d.priority==='high'?'rgba(99,102,241,0.1)':'rgba(255,255,255,0.05)',color:d.priority==='critical'?'#f87171':d.priority==='high'?'#818cf8':'rgba(255,255,255,0.4)',fontWeight:600,textTransform:'capitalize'}}>{d.priority}</span>
                  </div>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" style={{padding:'6px 14px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:7,color:'#818cf8',fontSize:12,fontWeight:600,textDecoration:'none'}}>Check →</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==='citations' && (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:12,padding:14,marginBottom:8}}>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.6)'}}>{data.citations?.estimatedDABoost} · {data.citations?.timeToComplete}</p>
            </div>
            {data.citations?.essential?.map((c:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:14,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontWeight:700,fontSize:22,color:'#4ade80',minWidth:28}}>{c.priority}</span>
                  <div>
                    <p style={{fontWeight:600,fontSize:14}}>{c.name}</p>
                    <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>DA {c.da} · {c.free?'Free':'Paid'}</p>
                  </div>
                </div>
                <a href={`https://${c.url}`} target="_blank" rel="noopener noreferrer" style={{padding:'6px 14px',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:7,color:'#4ade80',fontSize:12,fontWeight:600,textDecoration:'none'}}>Add Listing →</a>
              </div>
            ))}
          </div>
        )}

        {tab==='keywords' && (
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{background:'rgba(255,255,255,0.04)'}}>
                {['Keyword','Volume','Difficulty','Local?','Intent'].map(h=><th key={h} style={{textAlign:'left',padding:'11px 14px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase'}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(data.localKeywords||[]).map((k:any,i:number)=>(
                  <tr key={i} style={{borderTop:'1px solid rgba(255,255,255,0.04)'}}>
                    <td style={{padding:'11px 14px',fontWeight:500}}>{k.keyword}</td>
                    <td style={{padding:'11px 14px',color:'#4ade80',fontWeight:700}}>{k.search_volume?.toLocaleString()}</td>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:36,height:4,background:'rgba(255,255,255,0.06)',borderRadius:100}}><div style={{height:'100%',width:`${k.difficulty}%`,background:k.difficulty<40?'#4ade80':k.difficulty<70?'#fbbf24':'#f87171',borderRadius:100}}/></div>
                        <span style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{k.difficulty}</span>
                      </div>
                    </td>
                    <td style={{padding:'11px 14px'}}>{k.localIntent?<span style={{color:'#4ade80',fontWeight:700}}>✓ Local</span>:<span style={{color:'rgba(255,255,255,0.3)'}}>—</span>}</td>
                    <td style={{padding:'11px 14px',color:'rgba(255,255,255,0.5)',fontSize:12,textTransform:'capitalize'}}>{k.intent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>}

      {!data && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>📍</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Dominate Local Search</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>Fill in your business details and we'll audit your local SEO, check NAP consistency across directories, find citation opportunities, and research local keywords.</p>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function PMaxPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [form, setForm] = useState({ websiteId:'', goal:'Get leads and enquiries', budget:'500', targetAudience:'Local customers', location:'Local area' });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState('');

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const generate = async () => {
    if (!form.websiteId) return;
    setLoading(true); setData(null);
    try { const r = await api.post('/features/pmax/generate', form); setData(r.data); }
    catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const copy = (text:string, id:string) => { navigator.clipboard.writeText(Array.isArray(text)?text.join('\n'):text); setCopied(id); setTimeout(()=>setCopied(''),2000); };

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#4285F4,#34A853)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📣</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Google Ads Performance Max</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>AI generates complete PMax campaign assets — headlines, descriptions, audience signals, images</p>
        </div>
      </div>

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:14}}>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Website</label>
            <select className="input-dark" value={form.websiteId} onChange={e=>setForm({...form,websiteId:e.target.value})}>
              <option value="">Choose...</option>
              {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Monthly Budget ($)</label>
            <input className="input-dark" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} type="number" placeholder="500"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Location</label>
            <input className="input-dark" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Manchester, UK"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Campaign Goal</label>
            <input className="input-dark" value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} placeholder="Get leads and enquiries"/>
          </div>
          <div style={{gridColumn:'span 2'}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Target Audience</label>
            <input className="input-dark" value={form.targetAudience} onChange={e=>setForm({...form,targetAudience:e.target.value})} placeholder="e.g. Homeowners aged 35-65 in Manchester"/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <button onClick={generate} disabled={loading||!form.websiteId} className="btn-primary" style={{padding:'11px 26px',fontSize:14}}>
            {loading?'⏳ Generating assets...':'📣 Generate PMax Assets'}
          </button>
        </div>
      </div>

      {data && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Expected results */}
          {data.expectedResults && (
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14}}>
              {[{l:'Impressions',v:data.expectedResults.impressions,c:'#6366f1'},{l:'Est. Clicks',v:data.expectedResults.clicks,c:'#4ade80'},{l:'Est. Leads',v:data.expectedResults.conversions,c:'#fbbf24'},{l:'Est. Cost/Lead',v:data.expectedResults.estimatedCPA,c:'#f87171'}].map(s=>(
                <div key={s.l} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:900,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{s.l}</div>
                </div>
              ))}
            </div>
          )}

          {/* Assets */}
          {[
            {title:'Headlines (max 30 chars each)',id:'headlines',value:data.headlines,desc:'Add all 15 headlines for maximum performance'},
            {title:'Long Headlines (max 90 chars)',id:'longHeadlines',value:data.longHeadlines,desc:'Used in display network ads'},
            {title:'Descriptions (max 90 chars)',id:'descriptions',value:data.descriptions,desc:'Describe your offer clearly'},
          ].map(section=>(
            <div key={section.id} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <div>
                  <h3 style={{fontSize:14,fontWeight:700}}>{section.title}</h3>
                  <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:2}}>{section.desc}</p>
                </div>
                <button onClick={()=>copy(section.value,section.id)} style={{padding:'7px 14px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:7,color:copied===section.id?'#4ade80':'#818cf8',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                  {copied===section.id?'✓ Copied':'📋 Copy All'}
                </button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {(section.value||[]).map((item:string,i:number)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'rgba(255,255,255,0.03)',borderRadius:8}}>
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.8)'}}>{item}</span>
                    <span style={{fontSize:11,color:item.length>30&&section.id==='headlines'?'#f87171':'rgba(255,255,255,0.25)',marginLeft:8}}>{item.length} chars</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Audience signals */}
          {data.audienceSignals && (
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:20}}>
              <h3 style={{fontSize:14,fontWeight:700,marginBottom:14}}>👥 Audience Signals</h3>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
                <div><p style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Demographics</p><p style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>{data.audienceSignals.demographics}</p></div>
                <div><p style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Interests</p><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{data.audienceSignals.interests?.map((i:string,j:number)=><span key={j} style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(99,102,241,0.1)',color:'#818cf8'}}>{i}</span>)}</div></div>
                <div><p style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Custom Search Terms</p><div style={{display:'flex',flexWrap:'wrap',gap:5}}>{data.audienceSignals.customSegments?.map((s:string,j:number)=><span key={j} style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(245,158,11,0.1)',color:'#fbbf24'}}>{s}</span>)}</div></div>
              </div>
            </div>
          )}

          {/* Setup guide */}
          {data.setupGuide && (
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:20}}>
              <h3 style={{fontSize:14,fontWeight:700,marginBottom:14}}>📋 Setup Guide</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {data.setupGuide.map((step:any,i:number)=>(
                  <div key={i} style={{display:'flex',gap:14,alignItems:'flex-start',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(66,133,244,0.15)',border:'1px solid rgba(66,133,244,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#60a5fa',fontSize:13,flexShrink:0}}>{step.step}</div>
                    <div><p style={{fontWeight:600,fontSize:14,marginBottom:3}}>{step.title}</p><p style={{fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>{step.detail}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!data && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>📣</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Generate Performance Max Assets</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>AI creates all headlines, descriptions, audience signals and a step-by-step setup guide for your Google Ads Performance Max campaign.</p>
        </div>
      )}
    </div>
  );
}

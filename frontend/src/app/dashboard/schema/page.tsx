'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function SchemaPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [form, setForm] = useState({ phone:'', email:'', address:'', city:'', country:'GB', description:'', rating:'', reviewCount:'' });
  const [loading, setLoading] = useState(false);
  const [schemas, setSchemas] = useState<any[]>([]);
  const [copied, setCopied] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const generate = async () => {
    if (!selectedSite) { setMsg('Select a website first'); return; }
    setLoading(true);
    try {
      const r = await api.post('/features/schema/generate', { websiteId: selectedSite, ...form });
      setSchemas(r.data.schemas||[]);
      setMsg('');
    } catch(e:any) { setMsg(e.response?.data?.error||'Failed'); }
    setLoading(false);
  };

  const copyCode = (code: any, id: string) => {
    const text = `<script type="application/ld+json">\n${JSON.stringify(code,null,2)}\n</script>`;
    navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(()=>setCopied(''),2000);
  };

  const priorityColor = (p:string) => p==='critical'?'#f87171':p==='high'?'#fbbf24':p==='medium'?'#60a5fa':'rgba(255,255,255,0.4)';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#8b5cf6,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🏷️</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Schema Markup Generator</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Generate ready-to-paste JSON-LD structured data — get rich snippets in Google results</p>
        </div>
      </div>

      {msg && <div style={{marginBottom:18,padding:'12px 16px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:10,fontSize:13,color:'#fca5a5'}}>{msg}</div>}

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
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Phone</label>
            <input className="input-dark" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+44 161 123 4567"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Email</label>
            <input className="input-dark" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="info@business.com"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>City</label>
            <input className="input-dark" value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Manchester"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Rating (1-5)</label>
            <input className="input-dark" value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})} placeholder="4.8" type="number" min="1" max="5" step="0.1"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Review Count</label>
            <input className="input-dark" value={form.reviewCount} onChange={e=>setForm({...form,reviewCount:e.target.value})} placeholder="127" type="number"/>
          </div>
          <div style={{gridColumn:'span 3'}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Business Description</label>
            <textarea className="input-dark" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Brief description of your business and services..." style={{height:70,resize:'vertical'}}/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <button onClick={generate} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 26px',fontSize:14}}>
            {loading?'⏳ Generating...':'🏷️ Generate Schema'}
          </button>
        </div>
      </div>

      {schemas.length > 0 && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {schemas.map((s:any,i:number)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,overflow:'hidden'}}>
              <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                    <p style={{fontWeight:700,fontSize:15}}>{s.label}</p>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(0,0,0,0.2)',color:priorityColor(s.priority),fontWeight:600,textTransform:'capitalize'}}>{s.priority}</span>
                  </div>
                  <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{s.description}</p>
                  <p style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:3}}>{s.placement}</p>
                </div>
                <button onClick={()=>copyCode(s.code,s.type)} style={{padding:'8px 18px',background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,color:copied===s.type?'#4ade80':'#818cf8',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                  {copied===s.type?'✓ Copied!':'📋 Copy Code'}
                </button>
              </div>
              <pre style={{margin:0,padding:'16px 20px',fontSize:11,color:'rgba(255,255,255,0.6)',overflowX:'auto',background:'rgba(0,0,0,0.2)',lineHeight:1.6,maxHeight:200,overflowY:'auto'}}>
                {`<script type="application/ld+json">\n${JSON.stringify(s.code,null,2)}\n</script>`}
              </pre>
            </div>
          ))}
        </div>
      )}

      {!schemas.length && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>🏷️</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Generate Schema Markup</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>Schema markup helps Google understand your business and can generate rich snippets (star ratings, FAQ dropdowns) directly in search results — increasing click-through rates by 20-30%.</p>
        </div>
      )}
    </div>
  );
}

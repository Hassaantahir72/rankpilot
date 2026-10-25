'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function SitemapPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const generate = async () => {
    if (!selectedSite) return;
    setLoading(true); setData(null); setSubmitResult(null);
    try {
      const r = await api.post('/features/sitemap/generate', { websiteId: selectedSite });
      setData(r.data);
      const website = websites.find(w=>w.id===selectedSite);
      if (website) setSitemapUrl(`${website.url}/sitemap.xml`);
    } catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const submitToGoogle = async () => {
    if (!selectedSite || !sitemapUrl) return;
    setSubmitting(true);
    try {
      const r = await api.post('/features/sitemap/submit-google', { websiteId: selectedSite, sitemapUrl });
      setSubmitResult(r.data);
    } catch(e:any) { setSubmitResult({ google:{ success:false, error:e.message } }); }
    setSubmitting(false);
  };

  const downloadSitemap = () => {
    if (!data?.generatedXML) return;
    const blob = new Blob([data.generatedXML], { type:'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='sitemap.xml'; a.click();
    URL.revokeObjectURL(url);
  };

  const copySitemap = () => { navigator.clipboard.writeText(data?.generatedXML||''); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const issueSevColor = (s:string) => s==='critical'?'#f87171':s==='warning'?'#fbbf24':'#60a5fa';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#10b981,#059669)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>🗺️</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>XML Sitemap Generator</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Auto-generate your sitemap and submit to Google Search Console in one click</p>
        </div>
      </div>

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24}}>
        <div style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap',marginBottom:14}}>
          <div style={{flex:1,minWidth:200}}>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Select Website</label>
            <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
              <option value="">Choose...</option>
              {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name} — {w.url}</option>)}
            </select>
          </div>
          <button onClick={generate} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 24px',fontSize:14}}>
            {loading?'⏳ Crawling pages...':'🗺️ Generate Sitemap'}
          </button>
        </div>
      </div>

      {data && <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,marginBottom:20}}>
          {[
            {l:'URLs Found',v:data.urlCount,c:'#6366f1'},
            {l:'Existing Sitemap',v:data.existingSitemap?.exists?'✅ Found':'❌ Missing',c:data.existingSitemap?.exists?'#4ade80':'#f87171'},
            {l:'Issues',v:data.issues?.length||0,c:data.issues?.length>0?'#f87171':'#4ade80'},
          ].map(s=>(
            <div key={s.l} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18,textAlign:'center'}}>
              <div style={{fontSize:24,fontWeight:900,color:s.c,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {data.issues?.length > 0 && (
          <div style={{marginBottom:20}}>
            {data.issues.map((issue:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${issueSevColor(issue.severity)}33`,borderRadius:10,padding:14,marginBottom:8,display:'flex',gap:12}}>
                <span style={{color:issueSevColor(issue.severity),flexShrink:0,fontSize:16}}>⚠️</span>
                <div><p style={{fontWeight:600,fontSize:13,marginBottom:3}}>{issue.issue}</p><p style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{issue.fix}</p></div>
              </div>
            ))}
          </div>
        )}

        {data.instructions && (
          <div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:12,padding:16,marginBottom:20}}>
            <p style={{fontSize:13,fontWeight:600,color:'#4ade80',marginBottom:8}}>How to use your sitemap:</p>
            {data.instructions.map((inst:string,i:number)=>(
              <p key={i} style={{fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.8}}>{inst}</p>
            ))}
          </div>
        )}

        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,overflow:'hidden',marginBottom:16}}>
          <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <p style={{fontWeight:700,fontSize:14}}>Generated sitemap.xml</p>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:2}}>{data.urlCount} URLs · Ready to upload</p>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button onClick={downloadSitemap} className="btn-primary" style={{padding:'8px 16px',fontSize:12}}>⬇️ Download sitemap.xml</button>
              <button onClick={copySitemap} style={{padding:'8px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:copied?'#4ade80':'rgba(255,255,255,0.5)',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>{copied?'✓ Copied':'📋 Copy XML'}</button>
            </div>
          </div>
          <pre style={{margin:0,padding:'14px 18px',fontSize:11,color:'rgba(255,255,255,0.5)',overflowX:'auto',background:'rgba(0,0,0,0.2)',lineHeight:1.6,maxHeight:250,overflowY:'auto'}}>
            {data.generatedXML?.slice(0,2000)}{data.generatedXML?.length>2000?'\n... ('+data.urlCount+' total URLs)':''}
          </pre>
        </div>

        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:20}}>
          <h3 style={{fontSize:14,fontWeight:700,marginBottom:6}}>Submit to Google & Bing</h3>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginBottom:14}}>Requires Google Search Console connected (Settings → Integrations). After uploading sitemap.xml to your server, enter the URL and submit.</p>
          <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200}}>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Sitemap URL</label>
              <input className="input-dark" value={sitemapUrl} onChange={e=>setSitemapUrl(e.target.value)} placeholder="https://yourwebsite.com/sitemap.xml"/>
            </div>
            <button onClick={submitToGoogle} disabled={submitting||!sitemapUrl} style={{padding:'11px 20px',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:10,color:'#4ade80',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {submitting?'⏳ Submitting...':'🚀 Submit to Google & Bing'}
            </button>
          </div>
          {submitResult && (
            <div style={{marginTop:14,display:'flex',flexDirection:'column',gap:8}}>
              {submitResult.google && (
                <div style={{padding:'10px 14px',background:submitResult.google.success?'rgba(74,222,128,0.08)':'rgba(239,68,68,0.08)',border:`1px solid ${submitResult.google.success?'rgba(74,222,128,0.25)':'rgba(239,68,68,0.25)'}`,borderRadius:8,fontSize:13,color:submitResult.google.success?'#4ade80':'#f87171'}}>
                  Google: {submitResult.google.success?`✅ ${submitResult.google.message}`:`❌ ${submitResult.google.error}`}
                </div>
              )}
              {submitResult.bing && (
                <div style={{padding:'10px 14px',background:submitResult.bing.success?'rgba(74,222,128,0.08)':'rgba(239,68,68,0.08)',border:`1px solid ${submitResult.bing.success?'rgba(74,222,128,0.25)':'rgba(239,68,68,0.25)'}`,borderRadius:8,fontSize:13,color:submitResult.bing.success?'#4ade80':'#f87171'}}>
                  Bing: {submitResult.bing.success?`✅ ${submitResult.bing.message}`:`❌ ${submitResult.bing.error}`}
                </div>
              )}
            </div>
          )}
        </div>
      </>}

      {!data && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>🗺️</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Generate Your XML Sitemap</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>We crawl your entire website, build a proper XML sitemap with priorities and change frequencies, then submit it to Google and Bing automatically.</p>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function BlogPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [keyword, setKeyword] = useState('');
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [tab, setTab] = useState<'write'|'topics'>('write');
  const [copied, setCopied] = useState('');
  const [wpForm, setWpForm] = useState({ siteUrl:'', username:'', appPassword:'' });
  const [publishing, setPublishing] = useState(false);
  const [pubResult, setPubResult] = useState<any>(null);

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const generatePost = async () => {
    if (!keyword || !selectedSite) return;
    setLoading(true); setPost(null); setPubResult(null);
    try {
      const r = await api.post('/features/blog/write', { websiteId: selectedSite, keyword, tone, audience });
      setPost(r.data);
    } catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const getTopics = async () => {
    if (!selectedSite) return;
    setLoadingTopics(true);
    try {
      const r = await api.post('/features/blog/topics', { websiteId: selectedSite, count: 10 });
      setTopics(r.data.topics||[]);
    } catch(e:any) { console.error(e); }
    setLoadingTopics(false);
  };

  const publishWP = async () => {
    if (!post || !wpForm.siteUrl || !wpForm.username || !wpForm.appPassword) return;
    setPublishing(true);
    try {
      const r = await api.post('/features/blog/publish-wordpress', { ...wpForm, post });
      setPubResult(r.data);
    } catch(e:any) { setPubResult({ success:false, error:e.message }); }
    setPublishing(false);
  };

  const copy = (text:string, id:string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(''),2000); };
  const priorityColor = (p:string) => p==='high'?'#f87171':p==='medium'?'#fbbf24':'rgba(255,255,255,0.4)';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>✍️</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>AI Blog Writer</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Full 1000+ word SEO-optimised blog posts — auto-publish to WordPress</p>
        </div>
      </div>

      <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:24,width:'fit-content'}}>
        {[{id:'write',label:'✍️ Write Post'},{id:'topics',label:'💡 Topic Ideas'}].map(t=>(
          <button key={t.id} onClick={()=>{ setTab(t.id as any); if(t.id==='topics'&&!topics.length)getTopics(); }} style={{padding:'8px 18px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit'}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='write' && <>
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:14,marginBottom:14}}>
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Target Keyword</label>
              <input className="input-dark" value={keyword} onChange={e=>setKeyword(e.target.value)} placeholder="e.g. plumber near me, best accounting software..."/>
            </div>
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Website</label>
              <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
                <option value="">Choose...</option>
                {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Tone</label>
              <select className="input-dark" value={tone} onChange={e=>setTone(e.target.value)}>
                {['professional','friendly','expert','conversational','authoritative'].map(t=><option key={t} value={t} style={{textTransform:'capitalize'}}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div style={{gridColumn:'span 3'}}>
              <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Target Audience (optional)</label>
              <input className="input-dark" value={audience} onChange={e=>setAudience(e.target.value)} placeholder="e.g. homeowners, small business owners, first-time buyers..."/>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button onClick={generatePost} disabled={loading||!keyword||!selectedSite} className="btn-primary" style={{padding:'11px 26px',fontSize:14}}>
              {loading?'⏳ Writing article (this takes 30-60s)...':'✍️ Write Blog Post'}
            </button>
          </div>
        </div>

        {post && (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* Meta */}
            <div style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:14,padding:20}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,flexWrap:'wrap',gap:12}}>
                <div>
                  <h2 style={{fontSize:18,fontWeight:800,marginBottom:6}}>{post.title}</h2>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    <span style={{fontSize:12,padding:'2px 10px',borderRadius:100,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)'}}>⏱ {post.estimatedReadTime}</span>
                    <span style={{fontSize:12,padding:'2px 10px',borderRadius:100,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)'}}>📝 {post.wordCount} words</span>
                    <span style={{fontSize:12,padding:'2px 10px',borderRadius:100,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.5)'}}>🔗 /{post.slug}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button onClick={()=>copy(post.content,'content')} style={{padding:'8px 16px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:8,color:copied==='content'?'#4ade80':'#818cf8',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {copied==='content'?'✓ Copied':'📋 Copy Markdown'}
                  </button>
                  <button onClick={()=>copy(post.htmlContent,'html')} style={{padding:'8px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:copied==='html'?'#4ade80':'rgba(255,255,255,0.5)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {copied==='html'?'✓ Copied':'📋 Copy HTML'}
                  </button>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[{l:'Meta Title',v:post.metaTitle},{l:'Meta Description',v:post.metaDescription},{l:'URL Slug',v:post.slug}].map(f=>(
                  <div key={f.l} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',minWidth:100,flexShrink:0,paddingTop:2}}>{f.l}</span>
                    <span style={{fontSize:12,color:'rgba(255,255,255,0.7)',lineHeight:1.5,flex:1}}>{f.v}</span>
                    <button onClick={()=>copy(f.v||'',f.l)} style={{padding:'3px 10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,color:copied===f.l?'#4ade80':'rgba(255,255,255,0.3)',fontSize:11,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>
                      {copied===f.l?'✓':'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Article content */}
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24}}>
              <h3 style={{fontSize:14,fontWeight:700,marginBottom:16}}>Article Content</h3>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.7)',lineHeight:1.9,whiteSpace:'pre-wrap',maxHeight:500,overflowY:'auto'}}>{post.content}</div>
            </div>

            {/* WordPress publish */}
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22}}>
              <h3 style={{fontSize:15,fontWeight:700,marginBottom:6}}>🌐 Auto-publish to WordPress</h3>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginBottom:16}}>Creates a draft post in your WordPress site. Get App Password: WordPress Dashboard → Users → Profile → Application Passwords</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
                {[{k:'siteUrl',l:'WordPress URL',p:'https://yoursite.com'},{k:'username',l:'Username',p:'admin'},{k:'appPassword',l:'App Password',p:'xxxx xxxx xxxx xxxx'}].map(f=>(
                  <div key={f.k}>
                    <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>{f.l}</label>
                    <input className="input-dark" value={(wpForm as any)[f.k]} onChange={e=>setWpForm({...wpForm,[f.k]:e.target.value})} placeholder={f.p} type={f.k==='appPassword'?'password':'text'}/>
                  </div>
                ))}
              </div>
              <button onClick={publishWP} disabled={publishing||!wpForm.siteUrl||!wpForm.username||!wpForm.appPassword} style={{padding:'10px 22px',background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:9,color:'#818cf8',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                {publishing?'⏳ Publishing...':'🚀 Publish as Draft'}
              </button>
              {pubResult && (
                <div style={{marginTop:12,padding:'10px 14px',background:pubResult.success?'rgba(74,222,128,0.08)':'rgba(239,68,68,0.08)',border:`1px solid ${pubResult.success?'rgba(74,222,128,0.25)':'rgba(239,68,68,0.25)'}`,borderRadius:8,fontSize:13,color:pubResult.success?'#4ade80':'#f87171'}}>
                  {pubResult.success?<>✅ Published as draft! <a href={pubResult.editUrl} target="_blank" rel="noopener noreferrer" style={{color:'#818cf8',marginLeft:8}}>Edit post →</a></>:`❌ ${pubResult.error}`}
                </div>
              )}
            </div>
          </div>
        )}

        {!post && !loading && (
          <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
            <div style={{fontSize:52,marginBottom:16}}>✍️</div>
            <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Write SEO Blog Posts in Seconds</h3>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>Enter a target keyword and our AI writes a complete, SEO-optimised blog post. Agencies charge £200+ per article — you get unlimited articles free.</p>
          </div>
        )}
      </>}

      {tab==='topics' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:12}}>
            <div style={{flex:1,minWidth:200}}>
              <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
                <option value="">Select website for topic ideas...</option>
                {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <button onClick={getTopics} disabled={loadingTopics||!selectedSite} className="btn-primary" style={{padding:'10px 20px',fontSize:13}}>
              {loadingTopics?'⏳ Generating...':'💡 Get Topic Ideas'}
            </button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {topics.map((t:any,i:number)=>(
              <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:16,display:'flex',justifyContent:'space-between',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                    <p style={{fontWeight:700,fontSize:14}}>{t.title}</p>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(255,255,255,0.05)',color:priorityColor(t.priority),fontWeight:600,textTransform:'capitalize'}}>{t.priority}</span>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)',textTransform:'capitalize'}}>{t.type}</span>
                  </div>
                  <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                    <span style={{fontSize:12,color:'#4ade80'}}>🔑 {t.keyword}</span>
                    <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>📈 {t.estimatedTraffic}</span>
                    <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>🎯 Difficulty: {t.difficulty}</span>
                  </div>
                </div>
                <button onClick={()=>{ setKeyword(t.keyword); setTab('write'); }} style={{padding:'8px 16px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:8,color:'#818cf8',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                  Write This →
                </button>
              </div>
            ))}
            {!topics.length && !loadingTopics && (
              <div style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.3)',fontSize:13}}>
                <div style={{fontSize:36,marginBottom:12}}>💡</div>
                Select your website and click "Get Topic Ideas" to generate 10 SEO blog topics
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

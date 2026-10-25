'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function EmailMarketingPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [sequenceType, setSequenceType] = useState('welcome');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<number|null>(0);
  const [copied, setCopied] = useState<number|null>(null);

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const generate = async () => {
    if (!selectedSite) return;
    setLoading(true); setData(null);
    try {
      const r = await api.post('/features/email-marketing/sequence', { websiteId: selectedSite, sequenceType, goal, targetAudience: audience });
      setData(r.data);
    } catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const copyEmail = (i:number, body:string) => { navigator.clipboard.writeText(body); setCopied(i); setTimeout(()=>setCopied(null),2000); };

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#ec4899,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📧</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Email Marketing Automation</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>AI writes complete email sequences — welcome, nurture, promotional and more</p>
        </div>
      </div>

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:14}}>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Website</label>
            <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
              <option value="">Choose...</option>
              {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Sequence Type</label>
            <select className="input-dark" value={sequenceType} onChange={e=>setSequenceType(e.target.value)}>
              <option value="welcome">Welcome Series (new subscribers)</option>
              <option value="nurture">Lead Nurture (convert leads)</option>
              <option value="reengagement">Re-engagement (win back)</option>
              <option value="promotional">Promotional Campaign</option>
              <option value="educational">Educational Series</option>
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Goal</label>
            <input className="input-dark" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="e.g. Book a free consultation"/>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Target Audience</label>
            <input className="input-dark" value={audience} onChange={e=>setAudience(e.target.value)} placeholder="e.g. Small business owners"/>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <button onClick={generate} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 26px',fontSize:14}}>
            {loading?'⏳ Writing emails...':'✉️ Generate Email Sequence'}
          </button>
        </div>
      </div>

      {data && <>
        <div style={{background:'rgba(236,72,153,0.06)',border:'1px solid rgba(236,72,153,0.2)',borderRadius:12,padding:14,marginBottom:20,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <p style={{fontWeight:700,fontSize:15,marginBottom:3}}>{data.sequenceName}</p>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}>{data.totalEmails} emails ready to use — copy and paste into your email platform</p>
          </div>
          <span style={{fontSize:24,fontWeight:900,color:'#ec4899'}}>{data.totalEmails} emails</span>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {(data.emails||[]).map((email:any,i:number)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,overflow:'hidden'}}>
              <div onClick={()=>setExpanded(expanded===i?null:i)} style={{padding:'16px 20px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'rgba(236,72,153,0.15)',border:'1px solid rgba(236,72,153,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'#ec4899',fontSize:13,flexShrink:0}}>{email.emailNumber}</div>
                  <div>
                    <p style={{fontWeight:600,fontSize:14,marginBottom:2}}>{email.subject}</p>
                    <p style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>Send day {email.sendDay} · {email.purpose}</p>
                  </div>
                </div>
                <span style={{color:'rgba(255,255,255,0.3)',fontSize:18}}>{expanded===i?'▲':'▼'}</span>
              </div>
              {expanded===i && (
                <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',padding:'16px 20px'}}>
                  <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                    <div style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'8px 14px',fontSize:12}}>
                      <span style={{color:'rgba(255,255,255,0.35)'}}>Subject: </span>
                      <span style={{fontWeight:600}}>{email.subject}</span>
                    </div>
                    <div style={{background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'8px 14px',fontSize:12}}>
                      <span style={{color:'rgba(255,255,255,0.35)'}}>CTA: </span>
                      <span style={{fontWeight:600,color:'#818cf8'}}>{email.cta}</span>
                    </div>
                  </div>
                  <pre style={{fontSize:13,color:'rgba(255,255,255,0.7)',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'inherit',margin:0,marginBottom:14}}>{email.body}</pre>
                  <button onClick={()=>copyEmail(i,email.body)} style={{padding:'8px 18px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:8,color:copied===i?'#4ade80':'#818cf8',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {copied===i?'✓ Copied!':'📋 Copy Email'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </>}

      {!data && !loading && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>📧</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Generate Email Sequences</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>AI writes complete, professional email sequences for your business. Welcome series, lead nurture, re-engagement campaigns — all ready to paste into Mailchimp, Brevo, or any email platform.</p>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { seoApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import PlanGate from '@/components/dashboard/PlanGate';
import Link from 'next/link';

type Tab = 'websites'|'audit'|'keywords'|'content'|'rankings'|'technical';

export default function SEOPage() {
  const { user, limits, trialDaysLeft } = useAuth();
  const [tab, setTab] = useState<Tab>('websites');
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({name:'',url:'',industry:''});
  const [adding, setAdding] = useState(false);
  const [audits, setAudits] = useState<any[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [auditRunning, setAuditRunning] = useState(false);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [technicalIssues, setTechnicalIssues] = useState<any[]>([]);
  const [contentForm, setContentForm] = useState({pageUrl:'',targetKeyword:'',pageType:'page',tone:'professional'});
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'info'|'error'|'success'>('info');

  useEffect(()=>{ loadWebsites(); },[]);
  useEffect(()=>{
    if(selectedSite){
      seoApi.getAudits(selectedSite.id).then(r=>setAudits(r.data.audits||[])).catch(()=>{});
      seoApi.getKeywords(selectedSite.id).then(r=>setKeywords(r.data.keywords||[])).catch(()=>{});
      seoApi.getRankings(selectedSite.id).then(r=>setRankings(r.data.rankings||[])).catch(()=>{});
      seoApi.getTechnicalIssues(selectedSite.id).then(r=>setTechnicalIssues(r.data.issues||[])).catch(()=>{});
    }
  },[selectedSite]);

  const loadWebsites = async()=>{
    try{ const {data}=await seoApi.getWebsites(); setWebsites(data.websites||[]); if(data.websites?.[0]&&!selectedSite) setSelectedSite(data.websites[0]); }catch{}
  };

  const showMsg=(text:string,type:'info'|'error'|'success'='info')=>{ setMsg(text); setMsgType(type); setTimeout(()=>setMsg(''),6000); };

  const addWebsite=async(e:any)=>{
    e.preventDefault(); setAdding(true);
    try{
      const {data}=await seoApi.addWebsite(addForm);
      showMsg('Website added successfully!','success');
      setShowAdd(false); setAddForm({name:'',url:'',industry:''});
      await loadWebsites(); setSelectedSite(data.website);
    }catch(err:any){ showMsg(err.response?.data?.error||'Failed to add website.','error'); }
    setAdding(false);
  };

  const runAudit=async()=>{
    if(!selectedSite) return;
    setAuditRunning(true);
    try{
      await seoApi.runAudit(selectedSite.id);
      showMsg('✅ Audit started! Takes 3-5 minutes. Refresh to see results.','success');
    }catch(err:any){ showMsg(err.response?.data?.error||'Audit failed.','error'); }
    setAuditRunning(false);
  };

  const loadAuditDetail=async(auditId:string)=>{
    try{ const {data}=await seoApi.getAuditDetail(selectedSite.id,auditId); setSelectedAudit(data.audit); }catch{}
  };

  const generateContent=async(e:any)=>{
    e.preventDefault(); setGeneratingContent(true); setGeneratedContent(null);
    try{
      const {data}=await seoApi.generateContent(selectedSite.id,contentForm);
      setGeneratedContent(data.content);
      showMsg('Content generated!','success');
    }catch(err:any){ showMsg(err.response?.data?.error||'Content generation failed.','error'); }
    setGeneratingContent(false);
  };

  const TABS=[
    {id:'websites',label:'Websites',icon:'🌐'},
    {id:'audit',label:'Audit',icon:'🔍'},
    {id:'keywords',label:'Keywords',icon:'🔑'},
    {id:'content',label:'AI Content',icon:'✍️'},
    {id:'rankings',label:'Rankings',icon:'📈'},
    {id:'technical',label:'Technical',icon:'🔧'},
  ] as const;

  const planColor=(score:number)=>score>=70?'#4ade80':score>=40?'#fbbf24':'#f87171';
  const sevColor=(s:string)=>s==='critical'?'#f87171':s==='warning'?'#fbbf24':'rgba(255,255,255,0.4)';
  const sevBg=(s:string)=>s==='critical'?'rgba(239,68,68,0.08)':s==='warning'?'rgba(245,158,11,0.08)':'rgba(255,255,255,0.03)';

  const maxWebsites = limits?.max_websites || 1;
  const canAddMore = websites.length < maxWebsites;

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:24,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:4}}>SEO Autopilot</h1>
          <p style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>Full SEO automation — audit, keywords, AI content, rank tracking.</p>
        </div>
        <button onClick={()=>setShowAdd(true)} disabled={!canAddMore} className="btn-primary" style={{fontSize:14,padding:'10px 20px',opacity:canAddMore?1:0.5}}>
          + Add website {!canAddMore&&`(${websites.length}/${maxWebsites})`}
        </button>
      </div>

      {!canAddMore&&(
        <div style={{marginBottom:20,padding:'12px 18px',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <p style={{fontSize:13,color:'#a5b4fc'}}>You've reached your limit of {maxWebsites} website{maxWebsites!==1?'s':''} on the {user?.plan} plan.</p>
          <Link href="/dashboard/billing" className="btn-primary" style={{fontSize:13,padding:'8px 18px',flexShrink:0}}>Upgrade →</Link>
        </div>
      )}

      {msg&&(
        <div style={{marginBottom:18,padding:'12px 16px',background:msgType==='error'?'rgba(239,68,68,0.08)':msgType==='success'?'rgba(74,222,128,0.08)':'rgba(99,102,241,0.08)',border:`1px solid ${msgType==='error'?'rgba(239,68,68,0.25)':msgType==='success'?'rgba(74,222,128,0.25)':'rgba(99,102,241,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='error'?'#fca5a5':msgType==='success'?'#4ade80':'#a5b4fc',display:'flex',justifyContent:'space-between'}}>
          <span>{msg}</span><button onClick={()=>setMsg('')} style={{background:'none',border:'none',color:'inherit',cursor:'pointer'}}>✕</button>
        </div>
      )}

      {/* Add website modal */}
      {showAdd&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{background:'#111118',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,padding:32,width:'100%',maxWidth:460}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:24}}>
              <h3 style={{fontSize:18,fontWeight:700}}>Add website</h3>
              <button onClick={()=>setShowAdd(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:20}}>✕</button>
            </div>
            <form onSubmit={addWebsite} style={{display:'flex',flexDirection:'column',gap:16}}>
              <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Website name</label><input className="input-dark" value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))} placeholder="My Business" required/></div>
              <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Website URL</label><input className="input-dark" type="url" value={addForm.url} onChange={e=>setAddForm(f=>({...f,url:e.target.value}))} placeholder="https://yourbusiness.com" required/></div>
              <div>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Industry</label>
                <select className="input-dark" value={addForm.industry} onChange={e=>setAddForm(f=>({...f,industry:e.target.value}))} required>
                  <option value="">Select industry...</option>
                  {['Restaurant','Dentist','Law Firm','E-commerce','SaaS / Software','Real Estate','Fitness & Gym','Healthcare','Education','Marketing Agency','Retail','Construction','Finance','Other'].map(i=><option key={i}>{i}</option>)}
                </select>
              </div>
              <div style={{display:'flex',gap:12,marginTop:4}}>
                <button type="submit" disabled={adding} className="btn-primary" style={{flex:1,justifyContent:'center',fontSize:14}}>{adding?'Adding...':'Add website'}</button>
                <button type="button" onClick={()=>setShowAdd(false)} style={{flex:1,padding:'11px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:14,fontFamily:'inherit'}}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Site selector */}
      {websites.length>0&&(
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          {websites.map((w:any)=>(
            <button key={w.id} onClick={()=>setSelectedSite(w)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:10,border:`1px solid ${selectedSite?.id===w.id?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.08)'}`,background:selectedSite?.id===w.id?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.02)',color:selectedSite?.id===w.id?'#a5b4fc':'rgba(255,255,255,0.55)',fontSize:13,fontWeight:selectedSite?.id===w.id?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>
              🌐 {w.name}
              {w.last_score!=null&&<span style={{fontSize:11,color:planColor(w.last_score),fontWeight:700}}>({w.last_score})</span>}
            </button>
          ))}
        </div>
      )}

      {!selectedSite?(
        <div style={{textAlign:'center',padding:'80px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16}}>
          <div style={{fontSize:52,marginBottom:16}}>🌐</div>
          <h3 style={{fontSize:18,fontWeight:700,marginBottom:10}}>Add your first website</h3>
          <p style={{fontSize:14,color:'rgba(255,255,255,0.4)',marginBottom:24,lineHeight:1.6}}>Paste your URL and let AI do the full SEO work for you.</p>
          <button onClick={()=>setShowAdd(true)} className="btn-primary">Add website →</button>
        </div>
      ):(
        <>
          {/* Tabs */}
          <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:24,flexWrap:'wrap',width:'fit-content'}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id as Tab)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s'}}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* AUDIT TAB */}
          {tab==='audit'&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
                  <div>
                    <h2 style={{fontSize:16,fontWeight:700,marginBottom:6}}>SEO Audit — {selectedSite.name}</h2>
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>AI crawls your site and gives a complete fix list with optimized content.</p>
                  </div>
                  <button onClick={runAudit} disabled={auditRunning} className="btn-primary" style={{fontSize:14,padding:'10px 22px',flexShrink:0}}>
                    {auditRunning?'⏳ Running...':'▶ Run Full Audit'}
                  </button>
                </div>
              </div>

              {audits.length===0&&<p style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'32px 0',fontSize:13}}>No audits yet. Run your first audit above.</p>}

              {audits.map((a:any)=>(
                <div key={a.id} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:20,cursor:'pointer',transition:'border-color 0.2s'}} onClick={()=>loadAuditDetail(a.id)}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:a.status==='complete'?'#4ade80':a.status==='running'?'#fbbf24':'#f87171',flexShrink:0}}/>
                      <div>
                        <p style={{fontSize:13,fontWeight:600,textTransform:'capitalize'}}>{a.status}</p>
                        <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:2}}>{new Date(a.started_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p>
                      </div>
                    </div>
                    {a.overall_score!=null&&(
                      <div style={{textAlign:'right'}}>
                        <span style={{fontSize:28,fontWeight:900,color:planColor(a.overall_score),fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{a.overall_score}</span>
                        <span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>/100</span>
                        <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:2}}>{a.pages_crawled} pages · {a.issues_found} issues</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Audit detail */}
              {selectedAudit&&(
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24,display:'flex',flexDirection:'column',gap:24}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <h3 style={{fontSize:16,fontWeight:700}}>Audit Report — Score: <span style={{color:planColor(selectedAudit.overall_score)}}>{selectedAudit.overall_score}/100</span></h3>
                    <button onClick={()=>setSelectedAudit(null)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:18}}>✕</button>
                  </div>

                  {selectedAudit.ai_analysis&&(
                    <div style={{padding:18,background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.18)',borderRadius:12}}>
                      <p style={{fontSize:12,fontWeight:700,color:'#818cf8',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>🤖 AI Summary</p>
                      <p style={{fontSize:14,color:'rgba(255,255,255,0.7)',lineHeight:1.7}}>{selectedAudit.ai_analysis.executiveSummary}</p>
                      <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
                        <span style={{fontSize:11,padding:'3px 10px',background:'rgba(99,102,241,0.12)',borderRadius:100,color:'#818cf8',fontWeight:600}}>Health: {selectedAudit.ai_analysis.overallHealth}</span>
                        <span style={{fontSize:11,padding:'3px 10px',background:'rgba(99,102,241,0.12)',borderRadius:100,color:'#818cf8',fontWeight:600}}>Rank ETA: {selectedAudit.ai_analysis.estimatedTimeToRank}</span>
                      </div>
                    </div>
                  )}

                  {selectedAudit.ai_analysis?.quickWins?.length>0&&(
                    <div>
                      <p style={{fontSize:13,fontWeight:700,marginBottom:12}}>⚡ Quick Wins</p>
                      {selectedAudit.ai_analysis.quickWins.slice(0,4).map((w:any,i:number)=>(
                        <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 14px',background:'rgba(74,222,128,0.04)',border:'1px solid rgba(74,222,128,0.1)',borderRadius:10,marginBottom:8}}>
                          <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,fontWeight:700,background:w.impact==='high'?'rgba(74,222,128,0.12)':'rgba(245,158,11,0.12)',color:w.impact==='high'?'#4ade80':'#fbbf24',flexShrink:0,marginTop:1}}>{w.impact}</span>
                          <div><p style={{fontSize:13,fontWeight:500,color:'#fff'}}>{w.action}</p><p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:2}}>{w.reason}</p></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedAudit.technical_issues?.length>0&&(
                    <div>
                      <p style={{fontSize:13,fontWeight:700,marginBottom:12}}>🔧 Technical Issues ({selectedAudit.technical_issues.length})</p>
                      {selectedAudit.technical_issues.slice(0,12).map((issue:any,i:number)=>(
                        <div key={i} style={{padding:'10px 14px',background:sevBg(issue.severity),border:`1px solid ${sevColor(issue.severity)}30`,borderRadius:10,marginBottom:8}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                            <span style={{fontSize:10,fontWeight:800,color:sevColor(issue.severity),textTransform:'uppercase',letterSpacing:'0.06em'}}>[{issue.severity}]</span>
                            <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>{issue.title}</span>
                          </div>
                          {issue.page&&<p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:4,fontFamily:'monospace'}}>{issue.page}</p>}
                          <p style={{fontSize:12,color:'rgba(255,255,255,0.55)'}}>→ Fix: {issue.fix}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedAudit.page_recommendations?.length>0&&(
                    <div>
                      <p style={{fontSize:13,fontWeight:700,marginBottom:12}}>📄 Page Recommendations</p>
                      {selectedAudit.page_recommendations.slice(0,5).map((r:any,i:number)=>(
                        <div key={i} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:16,marginBottom:10}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',fontFamily:'monospace',flex:1,marginRight:10}}>{r.pageUrl}</p>
                            <span style={{fontSize:14,fontWeight:700,color:planColor(r.currentScore||0),flexShrink:0}}>{r.currentScore}/100</span>
                          </div>
                          <div style={{display:'flex',flexDirection:'column',gap:6}}>
                            <p style={{fontSize:12}}><span style={{color:'rgba(255,255,255,0.4)'}}>New title: </span><span style={{color:'#4ade80'}}>{r.recommendedTitle}</span></p>
                            <p style={{fontSize:12}}><span style={{color:'rgba(255,255,255,0.4)'}}>New H1: </span><span style={{color:'#4ade80'}}>{r.recommendedH1}</span></p>
                            <p style={{fontSize:12}}><span style={{color:'rgba(255,255,255,0.4)'}}>Keyword: </span><span style={{fontSize:11,padding:'2px 8px',background:'rgba(99,102,241,0.12)',borderRadius:100,color:'#818cf8'}}>{r.targetKeyword}</span></p>
                          </div>
                          <button onClick={()=>{setContentForm(f=>({...f,pageUrl:r.pageUrl,targetKeyword:r.targetKeyword}));setTab('content');}} style={{marginTop:10,fontSize:12,padding:'5px 14px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:6,color:'#818cf8',cursor:'pointer',fontFamily:'inherit'}}>Generate content →</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedAudit.ai_analysis?.contentStrategy?.recommendedBlogTopics?.length>0&&(
                    <div>
                      <p style={{fontSize:13,fontWeight:700,marginBottom:12}}>📝 Recommended Blog Posts</p>
                      {selectedAudit.ai_analysis.contentStrategy.recommendedBlogTopics.map((t:string,i:number)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,marginBottom:8}}>
                          <span style={{fontSize:12,fontWeight:700,color:'#6366f1',width:20,flexShrink:0}}>#{i+1}</span>
                          <span style={{fontSize:13,color:'rgba(255,255,255,0.7)',flex:1}}>{t}</span>
                          <button onClick={()=>{setContentForm(f=>({...f,targetKeyword:t,pageType:'blog'}));setTab('content');}} style={{fontSize:11,padding:'4px 12px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:6,color:'#818cf8',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>Write →</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* KEYWORDS TAB */}
          {tab==='keywords'&&(
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <h2 style={{fontSize:15,fontWeight:700}}>{keywords.length} Keywords Found</h2>
              </div>
              {keywords.length>0?(
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                    <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                      {['Keyword','Volume','Difficulty','Intent','Position'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 12px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {keywords.slice(0,50).map((k:any)=>(
                        <tr key={k.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <td style={{padding:'10px 12px',fontWeight:500,color:'rgba(255,255,255,0.85)'}}>{k.keyword}</td>
                          <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.55)'}}>{k.search_volume?.toLocaleString()}</td>
                          <td style={{padding:'10px 12px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{width:40,height:4,borderRadius:100,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
                                <div style={{height:'100%',width:`${k.difficulty}%`,background:k.difficulty>=70?'#f87171':k.difficulty>=40?'#fbbf24':'#4ade80',borderRadius:100}}/>
                              </div>
                              <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{k.difficulty}</span>
                            </div>
                          </td>
                          <td style={{padding:'10px 12px'}}>
                            <span style={{fontSize:11,padding:'2px 8px',background:'rgba(99,102,241,0.1)',borderRadius:100,color:'#818cf8',textTransform:'capitalize'}}>{k.intent}</span>
                          </td>
                          <td style={{padding:'10px 12px',color:k.current_position?'rgba(255,255,255,0.65)':'rgba(255,255,255,0.25)'}}>{k.current_position?`#${k.current_position}`:'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ):<p style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'40px 0',fontSize:13}}>Run an audit first to populate keywords.</p>}
            </div>
          )}

          {/* CONTENT TAB */}
          {tab==='content'&&(
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <PlanGate feature="max_content_per_month">
                <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22}}>
                  <h2 style={{fontSize:15,fontWeight:700,marginBottom:20}}>Generate AI-Optimized Content</h2>
                  <form onSubmit={generateContent} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                    <div style={{gridColumn:'1/-1'}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Page URL</label><input className="input-dark" value={contentForm.pageUrl} onChange={e=>setContentForm(f=>({...f,pageUrl:e.target.value}))} placeholder="https://yourbusiness.com/service" required/></div>
                    <div style={{gridColumn:'1/-1'}}><label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Target keyword</label><input className="input-dark" value={contentForm.targetKeyword} onChange={e=>setContentForm(f=>({...f,targetKeyword:e.target.value}))} placeholder="best dentist in chicago" required/></div>
                    <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Page type</label><select className="input-dark" value={contentForm.pageType} onChange={e=>setContentForm(f=>({...f,pageType:e.target.value}))}>{['page','homepage','service','blog','about','contact','product'].map(t=><option key={t}>{t}</option>)}</select></div>
                    <div><label style={{display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Tone</label><select className="input-dark" value={contentForm.tone} onChange={e=>setContentForm(f=>({...f,tone:e.target.value}))}>{['professional','friendly','authoritative','conversational','persuasive'].map(t=><option key={t}>{t}</option>)}</select></div>
                    <div style={{gridColumn:'1/-1'}}>
                      <button type="submit" disabled={generatingContent} className="btn-primary" style={{fontSize:14,padding:'11px 24px'}}>
                        {generatingContent?'⏳ AI is writing your content...':'✍️ Generate Optimized Content'}
                      </button>
                    </div>
                  </form>
                </div>
                {generatedContent&&(
                  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:14,padding:24,display:'flex',flexDirection:'column',gap:16}}>
                    <p style={{fontSize:14,fontWeight:700,color:'#4ade80'}}>✅ Content Generated!</p>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      {[{l:'Meta Title',v:generatedContent.metaTitle},{l:'Meta Description',v:generatedContent.metaDescription},{l:'H1 Heading',v:generatedContent.h1},{l:'Word Count',v:generatedContent.wordCount+' words'}].map(item=>(
                        <div key={item.l} style={{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:'12px 14px'}}>
                          <p style={{fontSize:11,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{item.l}</p>
                          <p style={{fontSize:13,color:'rgba(255,255,255,0.8)'}}>{item.v}</p>
                        </div>
                      ))}
                    </div>
                    {generatedContent.keywordsUsed?.length>0&&(
                      <div><p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Keywords used:</p><div style={{display:'flex',flexWrap:'wrap',gap:6}}>{generatedContent.keywordsUsed.map((k:string)=><span key={k} style={{fontSize:11,padding:'3px 10px',background:'rgba(99,102,241,0.12)',borderRadius:100,color:'#818cf8'}}>{k}</span>)}</div></div>
                    )}
                    <div>
                      <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Full content (copy and paste to your website):</p>
                      <div style={{background:'#0a0a14',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:16,fontFamily:'monospace',fontSize:12,color:'rgba(255,255,255,0.7)',maxHeight:280,overflowY:'auto',lineHeight:1.7,whiteSpace:'pre-wrap'}}>{generatedContent.content}</div>
                    </div>
                    <button onClick={()=>{navigator.clipboard.writeText(generatedContent.content);showMsg('Content copied to clipboard!','success');}} style={{alignSelf:'flex-start',padding:'9px 20px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:8,color:'#818cf8',cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit'}}>📋 Copy Content</button>
                  </div>
                )}
              </PlanGate>
            </div>
          )}

          {/* RANKINGS TAB */}
          {tab==='rankings'&&(
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22}}>
              <h2 style={{fontSize:15,fontWeight:700,marginBottom:20}}>Keyword Rankings</h2>
              {rankings.length>0?(
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                    {['Keyword','Position','Change','Checked'].map(h=><th key={h} style={{textAlign:'left',padding:'10px 12px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {rankings.map((r:any,i:number)=>{
                      const change=r.previous_position?r.previous_position-r.position:null;
                      return(
                        <tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                          <td style={{padding:'10px 12px',fontWeight:500,color:'rgba(255,255,255,0.8)'}}>{r.keyword}</td>
                          <td style={{padding:'10px 12px',fontWeight:700,color:'rgba(255,255,255,0.9)'}}>{r.position?`#${r.position}`:'—'}</td>
                          <td style={{padding:'10px 12px'}}>
                            {change!==null?<span style={{fontWeight:600,color:change>0?'#4ade80':change<0?'#f87171':'rgba(255,255,255,0.35)'}}>{change>0?`↑${change}`:change<0?`↓${Math.abs(change)}`:'—'}</span>:'—'}
                          </td>
                          <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.35)',fontSize:12}}>{new Date(r.checked_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ):<p style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'40px 0',fontSize:13}}>Rankings are checked every Monday. Run an audit first.</p>}
            </div>
          )}

          {/* TECHNICAL TAB */}
          {tab==='technical'&&(
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22}}>
              <h2 style={{fontSize:15,fontWeight:700,marginBottom:20}}>Technical Issues ({technicalIssues.length})</h2>
              {technicalIssues.length>0?(
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {technicalIssues.map((issue:any,i:number)=>(
                    <div key={i} style={{padding:'12px 16px',background:sevBg(issue.severity),border:`1px solid ${sevColor(issue.severity)}30`,borderRadius:10}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontSize:10,fontWeight:800,color:sevColor(issue.severity),textTransform:'uppercase',letterSpacing:'0.06em',flexShrink:0}}>[{issue.severity}]</span>
                        <span style={{fontSize:13,fontWeight:600,color:'#fff'}}>{issue.title}</span>
                      </div>
                      {issue.description&&<p style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginBottom:6}}>{issue.description}</p>}
                      {issue.page&&<p style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontFamily:'monospace',marginBottom:6}}>{issue.page}</p>}
                      <p style={{fontSize:12,color:'rgba(255,255,255,0.65)'}}>✅ Fix: {issue.fix}</p>
                    </div>
                  ))}
                </div>
              ):<p style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'40px 0',fontSize:13}}>Run an audit first to see technical issues.</p>}
            </div>
          )}

          {/* WEBSITES TAB */}
          {tab==='websites'&&(
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {websites.map((w:any)=>(
                <div key={w.id} style={{background:'rgba(255,255,255,0.02)',border:`1px solid ${selectedSite?.id===w.id?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.07)'}`,borderRadius:14,padding:20,cursor:'pointer',transition:'all 0.2s'}} onClick={()=>setSelectedSite(w)}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <p style={{fontWeight:700,fontSize:15,color:'rgba(255,255,255,0.9)',marginBottom:4}}>{w.name}</p>
                      <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:4}}>{w.url}</p>
                      <p style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>{w.industry}</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                      {w.last_score!=null?(
                        <div>
                          <div style={{fontSize:36,fontWeight:900,color:planColor(w.last_score),fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1}}>{w.last_score}</div>
                          <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:2}}>SEO score</div>
                        </div>
                      ):<span style={{fontSize:12,color:'rgba(255,255,255,0.3)'}}>No audit yet</span>}
                      <button onClick={e=>{e.stopPropagation();setSelectedSite(w);setTab('audit');}} className="btn-primary" style={{marginTop:10,fontSize:12,padding:'7px 16px'}}>Run Audit →</button>
                    </div>
                  </div>
                </div>
              ))}
              {websites.length===0&&(
                <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
                  <p style={{color:'rgba(255,255,255,0.3)',marginBottom:20,fontSize:14}}>No websites added yet</p>
                  <button onClick={()=>setShowAdd(true)} className="btn-primary">Add your first website →</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

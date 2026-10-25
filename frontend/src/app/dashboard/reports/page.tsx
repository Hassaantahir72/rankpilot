'use client';
import { useState, useEffect } from 'react';
import { reportsApi, seoApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import PlanGate from '@/components/dashboard/PlanGate';
import Link from 'next/link';

function ReportDetail({ data }: { data: any }) {
  if (!data) return null;
  const trendIcon = data.overallTrend==='improving'?'📈':data.overallTrend==='declining'?'📉':'➡️';
  const trendCol = data.overallTrend==='improving'?'#4ade80':data.overallTrend==='declining'?'#f87171':'rgba(255,255,255,0.5)';
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
          <span style={{ fontSize:22 }}>{trendIcon}</span>
          <h2 style={{ fontSize:17,fontWeight:700,color:'#fff' }}>{data.subject}</h2>
        </div>
        <p style={{ fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.75 }}>{data.summary}</p>
      </div>
      {data.alert && (
        <div style={{ padding:'12px 16px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.22)',borderRadius:10 }}>
          <p style={{ fontSize:13,fontWeight:600,color:'#fca5a5' }}>⚠️ Alert: {data.alert}</p>
        </div>
      )}
      {data.biggestWin && (
        <div style={{ padding:'14px 18px',background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.18)',borderRadius:12 }}>
          <p style={{ fontSize:11,fontWeight:700,color:'#4ade80',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6 }}>🏆 Biggest Win</p>
          <p style={{ fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.65 }}>{data.biggestWin}</p>
        </div>
      )}
      <div>
        <p style={{ fontSize:13,fontWeight:700,marginBottom:12 }}>📈 Rankings</p>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14 }}>
          {[{l:'Improved',v:data.rankingChanges?.improved||0,c:'#4ade80'},{l:'Declined',v:data.rankingChanges?.declined||0,c:'#f87171'},{l:'New',v:data.rankingChanges?.new||0,c:'#818cf8'}].map(s=>(
            <div key={s.l} style={{ background:'rgba(255,255,255,0.03)',borderRadius:10,padding:'12px',textAlign:'center' }}>
              <p style={{ fontSize:22,fontWeight:800,color:s.c,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s.v}</p>
              <p style={{ fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:3 }}>{s.l}</p>
            </div>
          ))}
        </div>
        {data.topRankings?.map((r:any,i:number)=>(
          <div key={i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize:13,color:'rgba(255,255,255,0.65)' }}>{r.keyword}</span>
            <div style={{ display:'flex',alignItems:'center',gap:8 }}>
              <span style={{ fontSize:13,fontWeight:700 }}>#{r.position}</span>
              {r.change&&<span style={{ fontSize:11,fontWeight:600,color:r.change.startsWith('+')?'#4ade80':'#f87171' }}>{r.change}</span>}
            </div>
          </div>
        ))}
      </div>
      <div>
        <p style={{ fontSize:13,fontWeight:700,marginBottom:12 }}>📢 Ad Performance</p>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
          {[{l:'Spend',v:data.adHighlights?.spend||'$0'},{l:'Leads',v:data.adHighlights?.leads||0},{l:'Best Ad',v:data.adHighlights?.bestAd||'N/A'}].map(s=>(
            <div key={s.l} style={{ background:'rgba(255,255,255,0.03)',borderRadius:10,padding:'12px',textAlign:'center' }}>
              <p style={{ fontSize:16,fontWeight:700,color:'#fff',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{s.v}</p>
              <p style={{ fontSize:11,color:'rgba(255,255,255,0.35)' }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>
      {data.whatWeDidThisWeek?.length>0&&(
        <div>
          <p style={{ fontSize:13,fontWeight:700,marginBottom:10 }}>✅ What we did this week</p>
          {data.whatWeDidThisWeek.map((item:string,i:number)=>(
            <div key={i} style={{ display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color:'#4ade80',flexShrink:0 }}>✓</span>
              <span style={{ fontSize:13,color:'rgba(255,255,255,0.65)' }}>{item}</span>
            </div>
          ))}
        </div>
      )}
      {data.whatWeWillDoNextWeek?.length>0&&(
        <div>
          <p style={{ fontSize:13,fontWeight:700,marginBottom:10 }}>🗓️ Next week plan</p>
          {data.whatWeWillDoNextWeek.map((item:string,i:number)=>(
            <div key={i} style={{ display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color:'#6366f1',flexShrink:0 }}>→</span>
              <span style={{ fontSize:13,color:'rgba(255,255,255,0.65)' }}>{item}</span>
            </div>
          ))}
        </div>
      )}
      {data.encouragingNote&&(
        <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)',fontStyle:'italic',borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:16 }}>{data.encouragingNote}</p>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { user, limits } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'info'|'error'|'success'>('info');

  useEffect(() => {
    reportsApi.getAll().then(r=>setReports(r.data.reports||[])).catch(()=>{});
    seoApi.getWebsites().then(r=>{
      const sites=r.data.websites||[];
      setWebsites(sites);
      if(sites[0]) setSelectedSite(sites[0].id);
    }).catch(()=>{});
  }, []);

  const showMsg = (text:string,type:'info'|'error'|'success'='info') => { setMsg(text); setMsgType(type); setTimeout(()=>setMsg(''),6000); };

  const generate = async () => {
    if(!selectedSite) { showMsg('Select a website first.','error'); return; }
    setGenerating(true);
    try {
      const {data}=await reportsApi.generate(selectedSite);
      showMsg('✅ Report generated and emailed to you!','success');
      setReports(prev=>[data.report,...prev]);
      setSelected({report:data.report,data:data.data});
    } catch(err:any){ showMsg(err.response?.data?.error||'Failed to generate report.','error'); }
    setGenerating(false);
  };

  const loadReport = async (id:string) => {
    try {
      const {data}=await reportsApi.getOne(id);
      setSelected({report:data.report,data:data.report?.data});
    } catch {}
  };

  const trendIcon=(t:string)=>t==='improving'?'📈':t==='declining'?'📉':'➡️';

  return (
    <div>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 style={{ fontSize:24,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:4 }}>Reports</h1>
          <p style={{ color:'rgba(255,255,255,0.4)',fontSize:14 }}>Plain-English weekly marketing reports — emailed every Monday.</p>
        </div>
        <div style={{ display:'flex',gap:12,alignItems:'center',flexWrap:'wrap' }}>
          {websites.length>0&&(
            <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)} style={{ width:'auto' }}>
              {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          <button onClick={generate} disabled={generating||!selectedSite} className="btn-primary" style={{ fontSize:14,padding:'10px 22px' }}>
            {generating?'⏳ Generating...':'📊 Generate Report'}
          </button>
        </div>
      </div>

      {msg&&(
        <div style={{ marginBottom:18,padding:'12px 16px',background:msgType==='error'?'rgba(239,68,68,0.08)':msgType==='success'?'rgba(74,222,128,0.08)':'rgba(99,102,241,0.08)',border:`1px solid ${msgType==='error'?'rgba(239,68,68,0.25)':msgType==='success'?'rgba(74,222,128,0.25)':'rgba(99,102,241,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='error'?'#fca5a5':msgType==='success'?'#4ade80':'#a5b4fc',display:'flex',justifyContent:'space-between' }}>
          <span>{msg}</span><button onClick={()=>setMsg('')} style={{ background:'none',border:'none',color:'inherit',cursor:'pointer' }}>✕</button>
        </div>
      )}

      {!limits?.weekly_reports && (
        <div style={{ marginBottom:20 }}>
          <PlanGate feature="weekly_reports" requiredPlan="growth">
            <></>
          </PlanGate>
        </div>
      )}

      <div style={{ display:'grid',gridTemplateColumns:'260px 1fr',gap:20,alignItems:'start' }}>
        {/* Reports list */}
        <div>
          <p style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12 }}>All reports</p>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {reports.length>0?reports.map((r:any)=>(
              <button key={r.id} onClick={()=>loadReport(r.id)} style={{ width:'100%',textAlign:'left',background:selected?.report?.id===r.id?'rgba(99,102,241,0.1)':'rgba(255,255,255,0.02)',border:`1px solid ${selected?.report?.id===r.id?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.07)'}`,borderRadius:12,padding:'14px 16px',cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4 }}>
                  <span style={{ fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.8)' }}>{r.websites?.name||'Report'}</span>
                  <span style={{ fontSize:14 }}>{trendIcon(r.overall_trend)}</span>
                </div>
                <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)' }}>{r.type} · {new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p>
              </button>
            )):(
              <div style={{ textAlign:'center',padding:'32px 12px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12 }}>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.3)' }}>No reports yet.</p>
                <p style={{ fontSize:11,color:'rgba(255,255,255,0.2)',marginTop:4 }}>Generate your first one!</p>
              </div>
            )}
          </div>
        </div>

        {/* Report detail */}
        <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:28,minHeight:300 }}>
          {selected?(
            <ReportDetail data={selected.data}/>
          ):(
            <div style={{ textAlign:'center',padding:'60px 24px' }}>
              <div style={{ fontSize:52,marginBottom:16 }}>📊</div>
              <h3 style={{ fontSize:17,fontWeight:700,marginBottom:10 }}>Generate your first report</h3>
              <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:24,lineHeight:1.65,maxWidth:380,margin:'0 auto 24px' }}>AI generates a plain-English report about your SEO and ad performance, then emails it to you automatically every week.</p>
              <button onClick={generate} disabled={generating||!selectedSite} className="btn-primary" style={{ fontSize:14,padding:'11px 24px' }}>
                {generating?'Generating...':'Generate report now →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

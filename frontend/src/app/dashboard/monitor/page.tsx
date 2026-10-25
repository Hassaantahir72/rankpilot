'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function MonitorPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const takeSnapshot = async () => {
    if (!selectedSite) return;
    setLoading(true);
    try {
      const [snap, alertsRes] = await Promise.all([
        api.post('/features/monitor/snapshot', { websiteId: selectedSite }),
        api.get(`/features/monitor/alerts/${selectedSite}`),
      ]);
      setSnapshot(snap.data);
      setAlerts(alertsRes.data.alerts||[]);
    } catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const loadAlerts = async () => {
    if (!selectedSite) return;
    try { const r = await api.get(`/features/monitor/alerts/${selectedSite}`); setAlerts(r.data.alerts||[]); }
    catch {}
  };

  const markRead = async (id:string) => {
    await api.post('/features/monitor/read', { alertIds: [id] });
    setAlerts(alerts.map(a=>a.id===id?{...a,is_read:true}:a));
  };

  const severityColor = (s:string) => s==='critical'?'#f87171':s==='high'?'#f97316':s==='medium'?'#fbbf24':'#60a5fa';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#06b6d4,#0891b2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>👁️</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Website Change Monitor</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Detect critical changes — title changes, noindex added, SSL lost, site down</p>
        </div>
      </div>

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24,display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Select Website</label>
          <select className="input-dark" value={selectedSite} onChange={e=>{ setSelectedSite(e.target.value); }}>
            <option value="">Choose...</option>
            {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name} — {w.url}</option>)}
          </select>
        </div>
        <button onClick={takeSnapshot} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 24px',fontSize:14}}>
          {loading?'⏳ Scanning...':'👁️ Scan Now'}
        </button>
        <button onClick={()=>{ if(selectedSite)loadAlerts(); }} disabled={!selectedSite} style={{padding:'11px 20px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'rgba(255,255,255,0.5)',fontSize:14,cursor:'pointer',fontFamily:'inherit'}}>
          🔔 View Alerts
        </button>
      </div>

      {alerts.length > 0 && (
        <div style={{marginBottom:20}}>
          <h3 style={{fontSize:14,fontWeight:700,marginBottom:12}}>🔔 Change Alerts ({alerts.filter(a=>!a.is_read).length} unread)</h3>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {alerts.map((a:any)=>(
              <div key={a.id} style={{background:a.is_read?'rgba(255,255,255,0.01)':'rgba(255,255,255,0.03)',border:`1px solid ${a.is_read?'rgba(255,255,255,0.05)':severityColor(a.severity)+'33'}`,borderRadius:12,padding:16,display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:`rgba(0,0,0,0.2)`,color:severityColor(a.severity),fontWeight:700,textTransform:'capitalize'}}>{a.severity}</span>
                    <span style={{fontWeight:600,fontSize:13}}>{a.field}</span>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <p style={{fontSize:13,color:'rgba(255,255,255,0.7)',marginBottom:5}}>{a.message}</p>
                  {a.old_value && <p style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>Was: "{a.old_value?.slice(0,80)}" → Now: "{a.new_value?.slice(0,80)}"</p>}
                </div>
                {!a.is_read && <button onClick={()=>markRead(a.id)} style={{padding:'4px 12px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:6,color:'rgba(255,255,255,0.4)',fontSize:11,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>Mark read</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshot && !snapshot.error && (
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22}}>
          <h3 style={{fontSize:14,fontWeight:700,marginBottom:16}}>Current Snapshot</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
            {[
              {l:'Status',v:snapshot.ok?'✅ Online':'❌ Down',c:snapshot.ok?'#4ade80':'#f87171'},
              {l:'SSL/HTTPS',v:snapshot.hasSSL?'✅ Secure':'❌ No SSL',c:snapshot.hasSSL?'#4ade80':'#f87171'},
              {l:'Word Count',v:`${snapshot.wordCount} words`,c:'rgba(255,255,255,0.7)'},
              {l:'Schema Markup',v:snapshot.hasSchema?'✅ Present':'⚠️ Missing',c:snapshot.hasSchema?'#4ade80':'#fbbf24'},
              {l:'Status Code',v:snapshot.statusCode,c:'rgba(255,255,255,0.7)'},
              {l:'Scanned At',v:new Date(snapshot.snapshotAt).toLocaleString(),c:'rgba(255,255,255,0.4)'},
            ].map(f=>(
              <div key={f.l} style={{background:'rgba(255,255,255,0.03)',borderRadius:8,padding:12}}>
                <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.05em'}}>{f.l}</p>
                <p style={{fontSize:13,fontWeight:600,color:f.c}}>{f.v}</p>
              </div>
            ))}
          </div>
          {snapshot.title && <div style={{display:'flex',gap:8,padding:'10px 0',borderTop:'1px solid rgba(255,255,255,0.05)'}}><span style={{fontSize:11,color:'rgba(255,255,255,0.3)',minWidth:80,flexShrink:0}}>Title</span><p style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>{snapshot.title}</p></div>}
          {snapshot.h1 && <div style={{display:'flex',gap:8,padding:'10px 0',borderTop:'1px solid rgba(255,255,255,0.05)'}}><span style={{fontSize:11,color:'rgba(255,255,255,0.3)',minWidth:80,flexShrink:0}}>H1</span><p style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>{snapshot.h1}</p></div>}
        </div>
      )}

      {!snapshot && !alerts.length && (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>👁️</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Monitor Your Website for Changes</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>We track your title tags, H1, SSL, robots settings and more. Get alerted instantly if anything changes that could hurt your rankings.</p>
        </div>
      )}
    </div>
  );
}

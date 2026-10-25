'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function PDFReportsPage() {
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState('');

  useEffect(() => { api.get('/seo/websites').then(r => setWebsites(r.data.websites||[])).catch(()=>{}); }, []);

  const generate = async () => {
    if (!selectedSite) return;
    setLoading(true);
    try {
      const r = await api.post('/features/reports/generate-pdf', { websiteId: selectedSite });
      setHtml(r.data.html||'');
    } catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const printPDF = () => {
    const w = window.open('','_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),500); }
  };

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#6366f1,#4f46e5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📄</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Automated PDF Reports</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>Generate client-ready branded SEO reports — print to PDF in one click</p>
        </div>
      </div>

      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,marginBottom:24,display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:200}}>
          <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Select Website</label>
          <select className="input-dark" value={selectedSite} onChange={e=>setSelectedSite(e.target.value)}>
            <option value="">Choose website...</option>
            {websites.map((w:any)=><option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={loading||!selectedSite} className="btn-primary" style={{padding:'11px 24px',fontSize:14}}>
          {loading?'⏳ Generating...':'📄 Generate Report'}
        </button>
        {html && (
          <button onClick={printPDF} style={{padding:'11px 24px',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:10,color:'#4ade80',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
            🖨️ Save as PDF
          </button>
        )}
      </div>

      {html ? (
        <div style={{background:'#fff',borderRadius:16,overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.5)'}}>
          <iframe srcDoc={html} style={{width:'100%',height:'900px',border:'none'}} title="SEO Report Preview"/>
        </div>
      ) : (
        <div style={{textAlign:'center',padding:'60px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14}}>
          <div style={{fontSize:52,marginBottom:16}}>📄</div>
          <h3 style={{fontSize:17,fontWeight:700,marginBottom:10}}>Generate a Client-Ready PDF Report</h3>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',lineHeight:1.6,maxWidth:420,margin:'0 auto'}}>Combines your audit results, keyword rankings, and ad performance into a professional branded report. Print to PDF and send to clients.</p>
        </div>
      )}
    </div>
  );
}

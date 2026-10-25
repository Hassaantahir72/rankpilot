'use client';
import { useState } from 'react';
import api from '@/lib/api';

export default function ReviewsPage() {
  const [tab, setTab] = useState<'respond'|'request'|'batch'>('respond');
  const [form, setForm] = useState({ businessName:'', reviewText:'', rating:'5', reviewerName:'' });
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestForm, setRequestForm] = useState({ businessName:'', customerName:'', service:'', googleLink:'' });
  const [requestResult, setRequestResult] = useState<any>(null);
  const [copied, setCopied] = useState('');

  const generateResponse = async () => {
    if (!form.reviewText) return;
    setLoading(true);
    try {
      const r = await api.post('/features/reviews/respond', { ...form, rating: parseInt(form.rating) });
      setResponse(r.data.response||'');
    } catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const generateRequest = async () => {
    setLoading(true);
    try {
      const r = await api.post('/features/reviews/request-email', requestForm);
      setRequestResult(r.data);
    } catch(e:any) { console.error(e); }
    setLoading(false);
  };

  const copy = (text:string, id:string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(''),2000); };
  const ratingColor = (r:number) => r>=4?'#4ade80':r===3?'#fbbf24':'#f87171';

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24}}>
        <div style={{width:42,height:42,borderRadius:12,background:'linear-gradient(135deg,#f59e0b,#ef4444)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⭐</div>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:2}}>Review Management</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>AI-generated review responses, request templates, and reputation management</p>
        </div>
      </div>

      <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:24,width:'fit-content'}}>
        {[{id:'respond',label:'💬 Respond to Reviews'},{id:'request',label:'📨 Request Reviews'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)} style={{padding:'8px 16px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit'}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==='respond' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:18}}>Review Details</h3>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Business Name</label>
                <input className="input-dark" value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})} placeholder="Your business name"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Reviewer Name</label>
                <input className="input-dark" value={form.reviewerName} onChange={e=>setForm({...form,reviewerName:e.target.value})} placeholder="John Smith"/>
              </div>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Star Rating</label>
                <div style={{display:'flex',gap:8}}>
                  {[1,2,3,4,5].map(r=>(
                    <button key={r} onClick={()=>setForm({...form,rating:r.toString()})} style={{width:40,height:40,borderRadius:8,border:`2px solid ${parseInt(form.rating)>=r?ratingColor(parseInt(form.rating)):'rgba(255,255,255,0.1)'}`,background:parseInt(form.rating)>=r?`rgba(${parseInt(form.rating)>=4?'74,222,128':parseInt(form.rating)===3?'251,191,36':'239,68,68'},0.1)`:'transparent',color:parseInt(form.rating)>=r?ratingColor(parseInt(form.rating)):'rgba(255,255,255,0.3)',cursor:'pointer',fontSize:18,fontFamily:'inherit'}}>⭐</button>
                  ))}
                  <span style={{fontSize:14,fontWeight:700,color:ratingColor(parseInt(form.rating)),alignSelf:'center',marginLeft:4}}>{form.rating}/5</span>
                </div>
              </div>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>Review Text</label>
                <textarea className="input-dark" value={form.reviewText} onChange={e=>setForm({...form,reviewText:e.target.value})} placeholder="Paste the review text here..." style={{height:120,resize:'vertical'}}/>
              </div>
              <button onClick={generateResponse} disabled={loading||!form.reviewText} className="btn-primary" style={{fontSize:14,padding:'11px 20px'}}>
                {loading?'⏳ Writing response...':'✍️ Generate Response'}
              </button>
            </div>
          </div>

          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:18}}>AI-Generated Response</h3>
            {response ? (
              <>
                <div style={{background:'rgba(74,222,128,0.06)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:10,padding:16,marginBottom:14,fontSize:14,color:'rgba(255,255,255,0.8)',lineHeight:1.8}}>
                  {response}
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={()=>copy(response,'resp')} style={{flex:1,padding:'10px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:8,color:copied==='resp'?'#4ade80':'#818cf8',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {copied==='resp'?'✓ Copied!':'📋 Copy Response'}
                  </button>
                  <button onClick={generateResponse} style={{padding:'10px 16px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'rgba(255,255,255,0.5)',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                    🔄 Regenerate
                  </button>
                </div>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'40px 20px',color:'rgba(255,255,255,0.25)',fontSize:13}}>
                <div style={{fontSize:36,marginBottom:12}}>✍️</div>
                <p>Enter a review and click Generate to get an AI-written professional response</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='request' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:18}}>Review Request Details</h3>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[
                {key:'businessName',label:'Business Name',placeholder:'Your Business Ltd'},
                {key:'customerName',label:'Customer Name',placeholder:'John Smith'},
                {key:'service',label:'Service Provided',placeholder:'e.g. Boiler repair'},
                {key:'googleLink',label:'Google Review Link',placeholder:'https://g.page/your-business/review'},
              ].map(f=>(
                <div key={f.key}>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>{f.label}</label>
                  <input className="input-dark" value={(requestForm as any)[f.key]} onChange={e=>setRequestForm({...requestForm,[f.key]:e.target.value})} placeholder={f.placeholder}/>
                </div>
              ))}
              <button onClick={generateRequest} disabled={loading||!requestForm.businessName} className="btn-primary" style={{fontSize:14,padding:'11px 20px'}}>
                {loading?'⏳ Generating...':'📨 Generate Review Request'}
              </button>
            </div>
          </div>

          {requestResult && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:20}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <h4 style={{fontSize:14,fontWeight:700}}>📧 Email Template</h4>
                  <button onClick={()=>copy(`Subject: ${requestResult.subject}\n\n${requestResult.body}`,'email')} style={{padding:'6px 14px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:7,color:copied==='email'?'#4ade80':'#818cf8',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {copied==='email'?'✓':'📋'} Copy
                  </button>
                </div>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginBottom:8}}>Subject: {requestResult.subject}</p>
                <pre style={{fontSize:12,color:'rgba(255,255,255,0.7)',lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:'inherit',margin:0}}>{requestResult.body}</pre>
              </div>
              <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:20}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                  <h4 style={{fontSize:14,fontWeight:700}}>💬 SMS Version</h4>
                  <button onClick={()=>copy(requestResult.smsVersion,'sms')} style={{padding:'6px 14px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:7,color:copied==='sms'?'#4ade80':'#818cf8',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
                    {copied==='sms'?'✓':'📋'} Copy
                  </button>
                </div>
                <p style={{fontSize:13,color:'rgba(255,255,255,0.7)',lineHeight:1.7}}>{requestResult.smsVersion}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

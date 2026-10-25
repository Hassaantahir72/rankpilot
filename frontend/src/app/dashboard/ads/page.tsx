'use client';
import { useState, useEffect } from 'react';
import { adsApi, seoApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import PlanGate from '@/components/dashboard/PlanGate';
import Link from 'next/link';

type Tab = 'overview'|'google'|'meta'|'social'|'copy';

function AdCopyDisplay({ copy }: { copy: any }) {
  const [copied, setCopied] = useState('');
  const cp = (text: string, key: string) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(''), 2000); };
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:18 }}>
      {copy.headlines?.length > 0 && (
        <div>
          <p style={{ fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10 }}>Headlines</p>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {copy.headlines.map((h: string, i: number) => (
              <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10 }}>
                <span style={{ fontSize:13,color:'rgba(255,255,255,0.8)',flex:1 }}>{h}</span>
                <button onClick={() => cp(h, `h${i}`)} style={{ fontSize:11,padding:'4px 10px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:6,color:'#818cf8',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' }}>{copied===`h${i}`?'✅':'Copy'}</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {copy.descriptions?.length > 0 && (
        <div>
          <p style={{ fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10 }}>Descriptions</p>
          <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
            {copy.descriptions.map((d: string, i: number) => (
              <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10 }}>
                <span style={{ fontSize:13,color:'rgba(255,255,255,0.8)',flex:1 }}>{d}</span>
                <button onClick={() => cp(d, `d${i}`)} style={{ fontSize:11,padding:'4px 10px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:6,color:'#818cf8',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' }}>{copied===`d${i}`?'✅':'Copy'}</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {copy.adSets?.length > 0 && (
        <div>
          <p style={{ fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10 }}>Ready-to-use Ad Sets</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            {copy.adSets.map((ad: any, i: number) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:16 }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
                  <span style={{ fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)' }}>{ad.name}</span>
                  {ad.predictedCTR && <span style={{ fontSize:11,color:'#4ade80',fontWeight:600 }}>CTR ~{ad.predictedCTR}</span>}
                </div>
                <p style={{ fontSize:13,fontWeight:600,color:'#fff',marginBottom:6 }}>{ad.headline}</p>
                <p style={{ fontSize:12,color:'rgba(255,255,255,0.55)',marginBottom:10,lineHeight:1.5 }}>{ad.description}</p>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                  <span style={{ fontSize:11,padding:'3px 10px',background:'rgba(99,102,241,0.12)',borderRadius:100,color:'#818cf8',fontWeight:600 }}>{ad.cta}</span>
                  <button onClick={() => cp(`${ad.headline}\n${ad.description}\nCTA: ${ad.cta}`, `ad${i}`)} style={{ fontSize:11,padding:'4px 10px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:6,color:'#818cf8',cursor:'pointer',fontFamily:'inherit' }}>{copied===`ad${i}`?'✅ Copied':'Copy'}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {copy.expectedResults && (
        <div style={{ padding:16,background:'rgba(74,222,128,0.04)',border:'1px solid rgba(74,222,128,0.15)',borderRadius:12 }}>
          <p style={{ fontSize:12,fontWeight:700,color:'#4ade80',marginBottom:12 }}>📈 Expected Results</p>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12 }}>
            {[{l:'Impressions',v:copy.expectedResults.impressions},{l:'Clicks',v:copy.expectedResults.clicks},{l:'Est. Leads',v:copy.expectedResults.estimatedLeads},{l:'Est. CPC',v:copy.expectedResults.estimatedCPC}].map(s=>(
              <div key={s.l} style={{ textAlign:'center' }}>
                <p style={{ fontSize:18,fontWeight:800,color:'#fff',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s.v}</p>
                <p style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:3 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {copy.audienceRecommendations && (
        <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:16 }}>
          <p style={{ fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10 }}>🎯 Audience</p>
          <p style={{ fontSize:13,color:'rgba(255,255,255,0.65)',marginBottom:6 }}><strong>Demographics:</strong> {copy.audienceRecommendations.demographics}</p>
          <p style={{ fontSize:13,color:'rgba(255,255,255,0.65)',marginBottom:6 }}><strong>Interests:</strong> {copy.audienceRecommendations.interests?.join(', ')}</p>
          {copy.audienceRecommendations.customAudiences?.length > 0 && <p style={{ fontSize:13,color:'rgba(255,255,255,0.65)' }}><strong>Custom audiences:</strong> {copy.audienceRecommendations.customAudiences.join(', ')}</p>}
        </div>
      )}
    </div>
  );
}

export default function AdsPage() {
  const { user, limits, canUse } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [websites, setWebsites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [adCopyResult, setAdCopyResult] = useState<any>(null);
  const [socialResult, setSocialResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'info'|'error'|'success'>('info');
  const [campaignForm, setCampaignForm] = useState({ campaignName:'',budget:'',goal:'leads',targetAudience:'',product:'',platform:'google' });
  const [copyForm, setCopyForm] = useState({ platform:'google',product:'',goal:'leads',targetAudience:'',budget:'500' });
  const [socialForm, setSocialForm] = useState({ platform:'instagram',topic:'',count:5 });

  useEffect(() => {
    seoApi.getWebsites().then(r => {
      const sites = r.data.websites || [];
      setWebsites(sites);
      if (sites[0]) { setSelectedSite(sites[0]); loadSiteData(sites[0].id); }
    }).catch(() => {});
  }, []);

  const loadSiteData = async (siteId: string) => {
    try {
      const [ov, social] = await Promise.all([adsApi.getOverview(siteId), adsApi.getSocialCalendar(siteId)]);
      setCampaigns(ov.data.campaigns || []);
      setSocialPosts(social.data.posts || []);
    } catch {}
  };

  const changeSite = (site: any) => { setSelectedSite(site); loadSiteData(site.id); };

  const showMsg = (text: string, type: 'info'|'error'|'success' = 'info') => { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 6000); };

  const createCampaign = async (e: any) => {
    e.preventDefault();
    if (!selectedSite) return;
    setLoading(true);
    try {
      const payload = { ...campaignForm, websiteId: selectedSite.id, budget: Number(campaignForm.budget) };
      const endpoint = campaignForm.platform === 'google' ? adsApi.createGoogleCampaign : adsApi.createMetaCampaign;
      const { data } = await endpoint(payload);
      setAdCopyResult(data.adCopy);
      showMsg('Campaign created with AI ad copy!', 'success');
      loadSiteData(selectedSite.id);
      setCampaignForm({ campaignName:'',budget:'',goal:'leads',targetAudience:'',product:'',platform:'google' });
    } catch (err: any) { showMsg(err.response?.data?.error || 'Failed to create campaign.', 'error'); }
    setLoading(false);
  };

  const generateCopy = async (e: any) => {
    e.preventDefault();
    if (!selectedSite) return;
    setLoading(true);
    try {
      const { data } = await adsApi.generateAdCopy({ ...copyForm, websiteId: selectedSite.id, budget: Number(copyForm.budget) });
      setAdCopyResult(data.adCopy);
      showMsg('Ad copy generated!', 'success');
    } catch (err: any) { showMsg(err.response?.data?.error || 'Failed to generate copy.', 'error'); }
    setLoading(false);
  };

  const generateSocial = async (e: any) => {
    e.preventDefault();
    if (!selectedSite) return;
    setLoading(true);
    try {
      const { data } = await adsApi.generateSocialContent({ ...socialForm, websiteId: selectedSite.id });
      setSocialResult(data.content);
      loadSiteData(selectedSite.id);
      showMsg('Social posts generated!', 'success');
    } catch (err: any) { showMsg(err.response?.data?.error || 'Failed.', 'error'); }
    setLoading(false);
  };

  const TABS = [
    { id:'overview',label:'Overview',icon:'📊' },
    { id:'google',label:'Google Ads',icon:'🔵' },
    { id:'meta',label:'Meta Ads',icon:'📘' },
    { id:'social',label:'Social Media',icon:'📱' },
    { id:'copy',label:'AI Ad Copy',icon:'✍️' },
  ] as const;

  const totals = Array.isArray(campaigns) ? {} : {};

  return (
    <div>
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <h1 style={{ fontSize:24,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:4 }}>Marketing Autopilot</h1>
          <p style={{ color:'rgba(255,255,255,0.4)',fontSize:14 }}>AI-powered Google Ads, Meta Ads, and social media automation.</p>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom:18,padding:'12px 16px',background:msgType==='error'?'rgba(239,68,68,0.08)':msgType==='success'?'rgba(74,222,128,0.08)':'rgba(99,102,241,0.08)',border:`1px solid ${msgType==='error'?'rgba(239,68,68,0.25)':msgType==='success'?'rgba(74,222,128,0.25)':'rgba(99,102,241,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='error'?'#fca5a5':msgType==='success'?'#4ade80':'#a5b4fc',display:'flex',justifyContent:'space-between' }}>
          <span>{msg}</span><button onClick={() => setMsg('')} style={{ background:'none',border:'none',color:'inherit',cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Site selector */}
      {websites.length > 0 && (
        <div style={{ display:'flex',gap:8,marginBottom:20,flexWrap:'wrap' }}>
          {websites.map((w: any) => (
            <button key={w.id} onClick={() => changeSite(w)} style={{ padding:'8px 16px',borderRadius:10,border:`1px solid ${selectedSite?.id===w.id?'rgba(99,102,241,0.5)':'rgba(255,255,255,0.08)'}`,background:selectedSite?.id===w.id?'rgba(99,102,241,0.12)':'rgba(255,255,255,0.02)',color:selectedSite?.id===w.id?'#a5b4fc':'rgba(255,255,255,0.55)',fontSize:13,fontWeight:selectedSite?.id===w.id?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s' }}>
              🌐 {w.name}
            </button>
          ))}
        </div>
      )}

      {!selectedSite ? (
        <div style={{ textAlign:'center',padding:'80px 24px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16 }}>
          <div style={{ fontSize:52,marginBottom:16 }}>📢</div>
          <p style={{ color:'rgba(255,255,255,0.4)',fontSize:14,marginBottom:20 }}>Add a website in the SEO section first, then come back here to set up ads.</p>
          <Link href="/dashboard/seo" className="btn-primary">Go to SEO →</Link>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:24,flexWrap:'wrap',width:'fit-content' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id as Tab)} style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s' }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {tab==='overview' && (
            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14 }}>
                {[
                  { label:'Active campaigns',value:campaigns.filter((c:any)=>c.status==='active').length,icon:'📢',color:'#6366f1' },
                  { label:'Total monthly budget',value:`$${campaigns.reduce((s:number,c:any)=>s+(c.budget_monthly||0),0).toLocaleString()}`,icon:'💰',color:'#4ade80' },
                  { label:'Draft campaigns',value:campaigns.filter((c:any)=>c.status==='draft').length,icon:'📝',color:'#fbbf24' },
                  { label:'Social posts saved',value:socialPosts.length,icon:'📱',color:'#8b5cf6' },
                ].map(s => (
                  <div key={s.label} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'18px 16px' }}>
                    <div style={{ fontSize:22,marginBottom:8 }}>{s.icon}</div>
                    <p style={{ fontSize:22,fontWeight:800,color:s.color,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:4 }}>{s.value}</p>
                    <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22 }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
                  <h2 style={{ fontSize:15,fontWeight:700 }}>Campaigns</h2>
                  <button onClick={() => setTab('google')} style={{ fontSize:13,color:'#818cf8',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit' }}>+ New campaign</button>
                </div>
                {campaigns.length > 0 ? campaigns.map((c: any) => (
                  <div key={c.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',gap:12 }}>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.85)',marginBottom:2 }}>{c.name}</p>
                      <p style={{ fontSize:12,color:'rgba(255,255,255,0.35)' }}>{c.platform} · ${c.budget_monthly}/mo · Goal: {c.goal}</p>
                    </div>
                    <span style={{ fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:100,background:c.status==='active'?'rgba(74,222,128,0.1)':c.status==='draft'?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.06)',color:c.status==='active'?'#4ade80':c.status==='draft'?'#fbbf24':'rgba(255,255,255,0.35)',flexShrink:0 }}>{c.status}</span>
                  </div>
                )) : (
                  <p style={{ textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'32px 0',fontSize:13 }}>No campaigns yet. Create your first one above.</p>
                )}
              </div>

              <div style={{ background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.04))',border:'1px solid rgba(99,102,241,0.2)',borderRadius:14,padding:22 }}>
                <h3 style={{ fontSize:15,fontWeight:700,marginBottom:8 }}>🔗 Connect your ad accounts</h3>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:18,lineHeight:1.65 }}>Connect Google and Meta to launch real campaigns and see live performance data.</p>
                <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
                  <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`} className="btn-primary" style={{ fontSize:13,padding:'10px 20px' }}>Connect Google →</a>
                  <a href={`${process.env.NEXT_PUBLIC_API_URL}/auth/meta`} style={{ fontSize:13,padding:'10px 20px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,color:'rgba(255,255,255,0.7)',textDecoration:'none',fontWeight:500 }}>Connect Meta →</a>
                </div>
              </div>
            </div>
          )}

          {/* GOOGLE ADS */}
          {tab==='google' && (
            <PlanGate feature="google_ads" requiredPlan="growth">
              <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24 }}>
                <h2 style={{ fontSize:15,fontWeight:700,marginBottom:20 }}>Create Google Ads Campaign</h2>
                <form onSubmit={createCampaign} style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Campaign name</label>
                    <input className="input-dark" value={campaignForm.campaignName} onChange={e=>setCampaignForm(f=>({...f,campaignName:e.target.value,platform:'google'}))} placeholder="Spring Promo 2024" required/>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Monthly budget (USD)</label>
                    <input className="input-dark" type="number" value={campaignForm.budget} onChange={e=>setCampaignForm(f=>({...f,budget:e.target.value}))} placeholder="500" min="50" required/>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Campaign goal</label>
                    <select className="input-dark" value={campaignForm.goal} onChange={e=>setCampaignForm(f=>({...f,goal:e.target.value}))}>
                      <option value="leads">Get Leads / Enquiries</option>
                      <option value="sales">Drive Sales</option>
                      <option value="traffic">Increase Traffic</option>
                      <option value="awareness">Brand Awareness</option>
                      <option value="calls">Phone Calls</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Product / Service</label>
                    <input className="input-dark" value={campaignForm.product} onChange={e=>setCampaignForm(f=>({...f,product:e.target.value}))} placeholder="What are you advertising?"/>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Target audience</label>
                    <input className="input-dark" value={campaignForm.targetAudience} onChange={e=>setCampaignForm(f=>({...f,targetAudience:e.target.value}))} placeholder="e.g. Local homeowners aged 30-55 looking for..."/>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <button type="submit" disabled={loading} className="btn-primary" style={{ fontSize:14,padding:'11px 24px' }}>
                      {loading?'⏳ Creating with AI...':'🚀 Create Campaign with AI Copy'}
                    </button>
                  </div>
                </form>
              </div>
              {adCopyResult && (
                <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:14,padding:24,marginTop:16 }}>
                  <p style={{ fontSize:14,fontWeight:700,color:'#4ade80',marginBottom:18 }}>✅ AI Ad Copy Ready!</p>
                  <AdCopyDisplay copy={adCopyResult}/>
                </div>
              )}
            </PlanGate>
          )}

          {/* META ADS */}
          {tab==='meta' && (
            <PlanGate feature="meta_ads" requiredPlan="pro">
              <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24 }}>
                <h2 style={{ fontSize:15,fontWeight:700,marginBottom:20 }}>Create Meta (Facebook & Instagram) Campaign</h2>
                <form onSubmit={(e) => { setCampaignForm(f=>({...f,platform:'meta'})); createCampaign(e); }} style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Campaign name</label>
                    <input className="input-dark" value={campaignForm.campaignName} onChange={e=>setCampaignForm(f=>({...f,campaignName:e.target.value,platform:'meta'}))} placeholder="Facebook Lead Gen Q1" required/>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Monthly budget (USD)</label>
                    <input className="input-dark" type="number" value={campaignForm.budget} onChange={e=>setCampaignForm(f=>({...f,budget:e.target.value}))} placeholder="300" min="50" required/>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Goal</label>
                    <select className="input-dark" value={campaignForm.goal} onChange={e=>setCampaignForm(f=>({...f,goal:e.target.value}))}>
                      <option value="leads">Lead Generation</option>
                      <option value="sales">Sales / Conversions</option>
                      <option value="traffic">Website Traffic</option>
                      <option value="awareness">Brand Awareness</option>
                      <option value="engagement">Post Engagement</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Product / Service</label>
                    <input className="input-dark" value={campaignForm.product} onChange={e=>setCampaignForm(f=>({...f,product:e.target.value}))} placeholder="What are you advertising?"/>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Target audience</label>
                    <input className="input-dark" value={campaignForm.targetAudience} onChange={e=>setCampaignForm(f=>({...f,targetAudience:e.target.value}))} placeholder="e.g. Parents with young children, ages 28-45..."/>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <button type="submit" disabled={loading} className="btn-primary" style={{ fontSize:14,padding:'11px 24px' }}>
                      {loading?'⏳ Creating...':'📘 Create Meta Campaign with AI Copy'}
                    </button>
                  </div>
                </form>
              </div>
              {adCopyResult && (
                <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:14,padding:24,marginTop:16 }}>
                  <p style={{ fontSize:14,fontWeight:700,color:'#4ade80',marginBottom:18 }}>✅ Meta Ad Copy Ready!</p>
                  <AdCopyDisplay copy={adCopyResult}/>
                </div>
              )}
            </PlanGate>
          )}

          {/* SOCIAL MEDIA */}
          {tab==='social' && (
            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
              <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24 }}>
                <h2 style={{ fontSize:15,fontWeight:700,marginBottom:20 }}>Generate Social Media Content</h2>
                <form onSubmit={generateSocial} style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14 }}>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Platform</label>
                    <select className="input-dark" value={socialForm.platform} onChange={e=>setSocialForm(f=>({...f,platform:e.target.value}))}>
                      {['instagram','facebook','linkedin','twitter','tiktok'].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Number of posts</label>
                    <select className="input-dark" value={socialForm.count} onChange={e=>setSocialForm(f=>({...f,count:Number(e.target.value)}))}>
                      {[3,5,7,10].map(n=><option key={n} value={n}>{n} posts</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Topic (optional)</label>
                    <input className="input-dark" value={socialForm.topic} onChange={e=>setSocialForm(f=>({...f,topic:e.target.value}))} placeholder="New service, tips, promo..."/>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <button type="submit" disabled={loading} className="btn-primary" style={{ fontSize:14,padding:'11px 24px' }}>
                      {loading?'⏳ Generating posts...':'📱 Generate Social Posts'}
                    </button>
                  </div>
                </form>
              </div>

              {socialResult?.posts && (
                <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
                  <p style={{ fontSize:14,fontWeight:700,color:'#4ade80' }}>✅ {socialResult.posts.length} Posts Generated</p>
                  {socialResult.posts.map((post: any, i: number) => (
                    <div key={i} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:20 }}>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8 }}>
                        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                          <span style={{ fontSize:11,padding:'3px 10px',background:'rgba(99,102,241,0.12)',borderRadius:100,color:'#818cf8',fontWeight:600,textTransform:'capitalize' }}>{post.type}</span>
                          {post.bestPostingTime && <span style={{ fontSize:11,color:'rgba(255,255,255,0.35)' }}>Best time: {post.bestPostingTime}</span>}
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(post.content+'\n\n'+post.hashtags?.join(' ')); }} style={{ fontSize:12,padding:'5px 14px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:6,color:'#818cf8',cursor:'pointer',fontFamily:'inherit' }}>📋 Copy</button>
                      </div>
                      <p style={{ fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.7,marginBottom:10,whiteSpace:'pre-line' }}>{post.content}</p>
                      {post.hashtags?.length > 0 && <div style={{ display:'flex',flexWrap:'wrap',gap:4,marginBottom:8 }}>{post.hashtags.map((h: string) => <span key={h} style={{ fontSize:12,color:'#6366f1',fontWeight:500 }}>{h}</span>)}</div>}
                      {post.imageIdea && <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)',borderTop:'1px solid rgba(255,255,255,0.05)',paddingTop:8 }}>🖼 Image idea: {post.imageIdea}</p>}
                    </div>
                  ))}
                </div>
              )}

              {!socialResult && socialPosts.length > 0 && (
                <div>
                  <p style={{ fontSize:14,fontWeight:600,marginBottom:12 }}>Saved Posts ({socialPosts.length})</p>
                  {socialPosts.slice(0,5).map((post: any) => (
                    <div key={post.id} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:16,marginBottom:10 }}>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
                        <span style={{ fontSize:11,padding:'3px 10px',background:'rgba(99,102,241,0.12)',borderRadius:100,color:'#818cf8',fontWeight:600,textTransform:'capitalize' }}>{post.platform}</span>
                        <span style={{ fontSize:11,color:post.status==='published'?'#4ade80':'rgba(255,255,255,0.35)',fontWeight:600 }}>{post.status}</span>
                      </div>
                      <p style={{ fontSize:13,color:'rgba(255,255,255,0.65)',lineHeight:1.6 }}>{post.content?.slice(0,200)}{post.content?.length>200?'...':''}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI AD COPY */}
          {tab==='copy' && (
            <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
              <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24 }}>
                <h2 style={{ fontSize:15,fontWeight:700,marginBottom:6 }}>AI Ad Copy Generator</h2>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:20 }}>Generate professional ad copy without creating a campaign.</p>
                <form onSubmit={generateCopy} style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Platform</label>
                    <select className="input-dark" value={copyForm.platform} onChange={e=>setCopyForm(f=>({...f,platform:e.target.value}))}>
                      <option value="google">Google Ads</option>
                      <option value="meta">Meta (Facebook/Instagram)</option>
                      <option value="both">Both Platforms</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Campaign goal</label>
                    <select className="input-dark" value={copyForm.goal} onChange={e=>setCopyForm(f=>({...f,goal:e.target.value}))}>
                      {['leads','sales','traffic','awareness','calls'].map(g=><option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Product / Service *</label>
                    <input className="input-dark" value={copyForm.product} onChange={e=>setCopyForm(f=>({...f,product:e.target.value}))} placeholder="What are you advertising?" required/>
                  </div>
                  <div>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Monthly budget</label>
                    <input className="input-dark" type="number" value={copyForm.budget} onChange={e=>setCopyForm(f=>({...f,budget:e.target.value}))} placeholder="500"/>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Target audience *</label>
                    <input className="input-dark" value={copyForm.targetAudience} onChange={e=>setCopyForm(f=>({...f,targetAudience:e.target.value}))} placeholder="Who are your ideal customers?" required/>
                  </div>
                  <div style={{ gridColumn:'1/-1' }}>
                    <button type="submit" disabled={loading} className="btn-primary" style={{ fontSize:14,padding:'11px 24px' }}>
                      {loading?'⏳ Writing your ad copy...':'✍️ Generate Ad Copy'}
                    </button>
                  </div>
                </form>
              </div>
              {adCopyResult && (
                <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:14,padding:24 }}>
                  <p style={{ fontSize:14,fontWeight:700,color:'#4ade80',marginBottom:18 }}>✅ Ad Copy Ready!</p>
                  <AdCopyDisplay copy={adCopyResult}/>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

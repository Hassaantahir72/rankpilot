'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';
import CountUp from '@/components/ui/CountUp';

function TypingText({ words }: { words: string[] }) {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[idx];
    let t: any;
    if (!deleting && displayed.length < word.length) t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 80);
    else if (!deleting && displayed.length === word.length) t = setTimeout(() => setDeleting(true), 2200);
    else if (deleting && displayed.length > 0) t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 42);
    else { setDeleting(false); setIdx((idx + 1) % words.length); }
    return () => clearTimeout(t);
  }, [displayed, deleting, idx, words]);
  return <span className="gradient-text">{displayed}<span style={{ borderRight: '3px solid #818cf8', marginLeft: 2 }} /></span>;
}

function GridBg() {
  return (
    <div style={{ position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden',zIndex:0 }}>
      <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)',backgroundSize:'60px 60px' }} />
      <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 80% 50% at 50% -10%,rgba(99,102,241,0.18),transparent)' }} />
      <div style={{ position:'absolute',top:'40%',left:'20%',width:400,height:400,background:'radial-gradient(circle,rgba(139,92,246,0.08),transparent 70%)',borderRadius:'50%' }} />
      <div style={{ position:'absolute',top:'30%',right:'15%',width:300,height:300,background:'radial-gradient(circle,rgba(236,72,153,0.06),transparent 70%)',borderRadius:'50%' }} />
      <div style={{ position:'absolute',bottom:0,left:0,right:0,height:250,background:'linear-gradient(transparent,#08080f)' }} />
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-btn" onClick={() => setOpen(o => !o)}>
        <span>{q}</span>
        <span style={{ transition:'transform 0.3s',transform:open?'rotate(45deg)':'none',color:open?'#6366f1':'rgba(255,255,255,0.3)',fontSize:24,lineHeight:1,flexShrink:0,marginLeft:16 }}>+</span>
      </button>
      <div className={`faq-body ${open?'open':''}`}>
        <p style={{ fontSize:14,color:'rgba(255,255,255,0.5)',lineHeight:'1.8' }}>{a}</p>
      </div>
    </div>
  );
}

function readJsonList<T>(content: Record<string,string>, key: string, fallback: T[]): T[] {
  const raw = content[key];
  if (!raw) return fallback;
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed as T[] : fallback; }
  catch { return fallback; }
}

const LOGOS = ['Google Ads','Meta Ads','Shopify','WordPress','Webflow','HubSpot','Stripe','Salesforce','Mailchimp','Zapier','Slack','Notion','WooCommerce','Wix'];

export default function HomePage() {
  const [siteContent, setSiteContent] = useState<Record<string,string>>({});
  useEffect(() => {
    let active = true;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    fetch((base.endsWith('/') ? base.slice(0, -1) : base) + '/site-content', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active && data?.content) setSiteContent(data.content); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const testimonials = readJsonList<any>(siteContent, 'homepage_testimonials_json', []);
  return (
    <>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes borderPulse{0%,100%{border-color:rgba(99,102,241,0.25)}50%{border-color:rgba(99,102,241,0.6)}}
      `}</style>
      <Navbar />
      {siteContent.homepage_notice && <div role="status" style={{background:'rgba(99,102,241,.14)',borderBottom:'1px solid rgba(129,140,248,.25)',padding:'10px 18px',textAlign:'center',color:'#c7d2fe',fontSize:13}}>{siteContent.homepage_notice}</div>}

      {/* HERO */}
      <section style={{ position:'relative',minHeight:'100vh',display:'flex',alignItems:'center',overflow:'hidden',paddingTop:80 }}>
        <GridBg />
        <div className="container" style={{ position:'relative',zIndex:1,textAlign:'center',paddingTop:80,paddingBottom:100 }}>
          <div className="animate-fade-up delay-0" style={{ marginBottom:24 }}>
            <span className="tag"><span style={{ width:7,height:7,borderRadius:'50%',background:'#4ade80',display:'inline-block',marginRight:2 }} />14-day free trial · No credit card required</span>
          </div>
          <h1 className="animate-fade-up delay-1" style={{ fontSize:'clamp(2.6rem,7vw,5.6rem)',fontWeight:900,lineHeight:1.06,letterSpacing:'-0.04em',marginBottom:28,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            {siteContent.homepage_hero_title || 'Your AI-Powered'}<br />
            <TypingText words={['SEO Expert','Marketing Team','Ad Manager','Content Writer','Growth Engine']} />
          </h1>
          <p className="animate-fade-up delay-2" style={{ fontSize:'clamp(1rem,2vw,1.2rem)',color:'rgba(255,255,255,0.5)',maxWidth:580,margin:'0 auto 44px',lineHeight:1.75 }}>
            {siteContent.homepage_hero_subtitle || 'Paste your URL. RankPilot audits your SEO, writes optimized content, and helps prepare Google and Meta ad campaigns with AI-powered tools.'}
          </p>
          <div className="animate-fade-up delay-3" style={{ display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap',marginBottom:56 }}>
            <Link href="/auth/signup?flow=trial" className="btn-primary" style={{ fontSize:16,padding:'15px 32px' }}>
              {siteContent.homepage_cta_label || 'Start free — no card needed'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link href="/features" className="btn-ghost" style={{ fontSize:16,padding:'15px 32px' }}>
              See how it works
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16 10,8"/></svg>
            </Link>
          </div>
          <div className="animate-fade-up delay-4" style={{display:'flex',justifyContent:'center',gap:20,flexWrap:'wrap',color:'rgba(255,255,255,.5)',fontSize:13}}>
            <span>✓ No credit card required for trial</span>
            <span>✓ Separate owner and customer workspaces</span>
            <span>✓ Plan-based feature limits</span>
          </div>
        </div>
      </section>

      {/* LOGO MARQUEE */}
      <section style={{ background:'#05050d',borderTop:'1px solid rgba(255,255,255,0.05)',borderBottom:'1px solid rgba(255,255,255,0.05)',padding:'40px 0' }}>
        <p style={{ textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:600,marginBottom:28 }}>Integrates with your favourite tools</p>
        <div className="marquee-wrap">
          <div className="marquee-track animate-marquee">
            {[...LOGOS,...LOGOS].map((l,i) => (
              <div key={i} style={{ padding:'0 44px',whiteSpace:'nowrap',color:'rgba(255,255,255,0.22)',fontSize:14,fontWeight:600,letterSpacing:'0.04em' }}>{l}</div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES — factual product features, not unverified performance metrics */}
      <section className="section" style={{background:'var(--dark-2)'}}>
        <div className="container">
          <ScrollReveal className="text-center" style={{marginBottom:64}}>
            <span className="tag" style={{marginBottom:20}}>{siteContent.homepage_stats_eyebrow || 'What you can do'}</span>
            <h2 style={{fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{siteContent.homepage_stats_heading || 'Core capabilities'}</h2>
          </ScrollReveal>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:20}}>
            {[
              {icon:'⌕',title:'SEO audits',description:'Review technical and on-page issues that may affect search visibility.',color:'#6366f1'},
              {icon:'⌘',title:'Keyword research',description:'Explore relevant keyword opportunities and organise your SEO priorities.',color:'#8b5cf6'},
              {icon:'✎',title:'AI content tools',description:'Prepare search-focused content drafts for review and refinement.',color:'#ec4899'},
              {icon:'▤',title:'Reporting',description:'Keep website work, audit history and progress information together.',color:'#4ade80'},
            ].map((item,i)=>(
              <ScrollReveal key={item.title} delay={i*80} type="scale">
                <div className="glass-card" style={{padding:'30px 24px',height:'100%'}}>
                  <div style={{fontSize:26,color:item.color,marginBottom:14}}>{item.icon}</div>
                  <h3 style={{fontWeight:700,fontSize:16,marginBottom:9,color:'#fff'}}>{item.title}</h3>
                  <p style={{fontSize:13,color:'rgba(255,255,255,.45)',lineHeight:1.7}}>{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <div className="container">
          <ScrollReveal className="text-center" style={{ marginBottom:80 }}>
            <span className="tag" style={{ marginBottom:20 }}>{siteContent.homepage_how_eyebrow || 'How it works'}</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:16 }}>
              From zero to ranking in <span className="gradient-text">3 steps</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,0.45)',maxWidth:460,margin:'0 auto',fontSize:16 }}>{siteContent.homepage_how_description || 'No SEO knowledge needed. Start with one website and upgrade as your needs grow.'}</p>
          </ScrollReveal>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:40,position:'relative' }}>
            <div style={{ position:'absolute',top:22,left:'calc(33% + 20px)',right:'calc(33% + 20px)',height:1,background:'linear-gradient(90deg,rgba(99,102,241,0.5),rgba(99,102,241,0.1))' }} />
            {[
              { n:'1',title:'Paste your URL',desc:'Add your website URL and tell us your industry. Takes 30 seconds. No setup, no code, no configuration.' },
              { n:'2',title:'AI analyses everything',desc:'RankPilot helps review your website, explore keyword opportunities, and identify practical areas to improve.' },
              { n:'3',title:'Turn insights into an action plan',desc:'Review recommendations, write content, launch ads, and send you weekly plain-English reports every Monday.' },
            ].map((s,i) => (
              <ScrollReveal key={s.n} delay={i*150} type="up" className="text-center">
                <div style={{ width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:20,margin:'0 auto 22px',boxShadow:'0 0 28px rgba(99,102,241,0.4)',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s.n}</div>
                <h3 style={{ fontWeight:600,fontSize:18,marginBottom:12 }}>{s.title}</h3>
                <p style={{ fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:'1.75',maxWidth:240,margin:'0 auto' }}>{s.desc}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* SEO FEATURE SPLIT */}
      <section className="section" style={{ background:'var(--dark-2)' }}>
        <div className="container">
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center' }}>
            <ScrollReveal type="left">
              <span className="tag" style={{ marginBottom:20 }}>{siteContent.homepage_seo_eyebrow || 'SEO Autopilot'}</span>
              <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.12,marginBottom:18 }}>{siteContent.homepage_seo_heading || 'AI-assisted tools for everyday SEO work'}</h2>
              <p style={{ color:'rgba(255,255,255,0.45)',fontSize:15,lineHeight:1.8,marginBottom:32 }}>{siteContent.homepage_seo_description || 'Review technical and on-page SEO issues, explore keyword opportunities, prepare search-focused drafts, and monitor your work from one workspace.'}</p>
              {readJsonList<string>(siteContent, 'homepage_seo_features_json', ['Full website crawl — every page audited and scored','AI researches 100+ keywords ranked by traffic opportunity','Page-by-page content rewrite with keywords naturally embedded','Competitor gap analysis — see what their traffic comes from','Weekly rank tracking with email alerts when positions change','Technical fixes: speed, schema markup, meta tags, broken links']).map(f => (
                <div key={f} style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:12 }}>
                  <div style={{ width:20,height:20,borderRadius:'50%',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.35)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <span style={{ fontSize:14,color:'rgba(255,255,255,0.65)' }}>{f}</span>
                </div>
              ))}
              <div style={{ marginTop:32 }}>
                <Link href="/features" className="btn-primary">Explore SEO features →</Link>
              </div>
            </ScrollReveal>
            <ScrollReveal type="right">
              <div className="glass-card" style={{ padding:28 }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                  <div><p style={{ fontWeight:600,fontSize:15 }}>SEO Audit — mybusiness.com</p><p style={{ fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:2 }}>Completed 2 minutes ago</p></div>
                  <div style={{ textAlign:'right' }}><div style={{ fontSize:36,fontWeight:900,color:'#f59e0b',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>47</div><div style={{ fontSize:11,color:'rgba(255,255,255,0.35)' }}>/100 score</div></div>
                </div>
                {[
                  { t:'12 critical issues found',c:'#ef4444',i:'🔴' },
                  { t:'8 pages missing meta descriptions',c:'#f59e0b',i:'🟡' },
                  { t:'No HTTPS — hurting rankings',c:'#ef4444',i:'🔴' },
                  { t:'47 keywords identified and ranked',c:'#4ade80',i:'🟢' },
                  { t:'AI content ready for 6 pages',c:'#818cf8',i:'🔵' },
                ].map((item,i) => (
                  <div key={i} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'rgba(255,255,255,0.025)',borderRadius:10,marginBottom:8,border:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:14 }}>{item.i}</span>
                    <span style={{ fontSize:13,color:'rgba(255,255,255,0.65)',flex:1 }}>{item.t}</span>
                    <span style={{ fontSize:11,color:item.c,fontWeight:600 }}>FIX →</span>
                  </div>
                ))}
                <div style={{ marginTop:18,padding:'14px 16px',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.22)',borderRadius:12 }}>
                  <p style={{ fontSize:13,color:'#818cf8',fontWeight:500 }}>✨ AI has rewritten content for your top 6 pages with all 47 keywords naturally embedded.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ADS FEATURE SPLIT */}
      <section className="section">
        <div className="container">
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center' }}>
            <ScrollReveal type="left">
              <div className="glass-card" style={{ padding:28 }}>
                <p style={{ fontWeight:600,fontSize:14,marginBottom:18 }}>📢 AI Campaign Manager</p>
                {[
                  { n:'Google — Lead Gen Campaign',spend:'$340',leads:18,cpl:'$18.88',s:'active',c:'#4ade80' },
                  { n:'Meta — Brand Awareness',spend:'$180',leads:9,cpl:'$20.00',s:'active',c:'#4ade80' },
                  { n:'Google Retargeting',spend:'$95',leads:12,cpl:'$7.91',s:'paused',c:'#f59e0b' },
                ].map((c,i) => (
                  <div key={i} style={{ padding:'12px 14px',background:'rgba(255,255,255,0.025)',borderRadius:10,marginBottom:8,border:'1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6 }}>
                      <span style={{ fontSize:13,fontWeight:500 }}>{c.n}</span>
                      <span style={{ fontSize:11,color:c.c,fontWeight:700,textTransform:'uppercase' }}>{c.s}</span>
                    </div>
                    <div style={{ display:'flex',gap:18 }}>
                      {[{ l:'Spend',v:c.spend },{ l:'Leads',v:c.leads },{ l:'CPL',v:c.cpl }].map(stat => (
                        <span key={stat.l} style={{ fontSize:12,color:'rgba(255,255,255,0.35)' }}>{stat.l}: <strong style={{ color:stat.l==='CPL'?'#4ade80':'#fff' }}>{stat.v}</strong></span>
                      ))}
                    </div>
                  </div>
                ))}
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:18 }}>
                  {[{ l:'Total spend',v:'$615' },{ l:'Total leads',v:'39' },{ l:'Avg CPL',v:'$15.77' }].map(s => (
                    <div key={s.l} style={{ background:'rgba(255,255,255,0.04)',borderRadius:10,padding:'12px 10px',textAlign:'center' }}>
                      <p style={{ fontSize:18,fontWeight:800,color:'#818cf8',fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s.v}</p>
                      <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:3 }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal type="right">
              <span className="tag" style={{ marginBottom:20 }}>{siteContent.homepage_marketing_eyebrow || 'Marketing Autopilot'}</span>
              <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.12,marginBottom:18 }}>{siteContent.homepage_marketing_heading || 'AI helps prepare campaigns like a marketing assistant'}</h2>
              <p style={{ color:'rgba(255,255,255,0.45)',fontSize:15,lineHeight:1.8,marginBottom:32 }}>{siteContent.homepage_marketing_description || 'Use AI tools to prepare Google and Meta campaign drafts and ad copy. Review campaign settings and approve changes before publishing.'}</p>
              {['AI-written Google Ads and Meta Ads copy that converts','Campaign draft assistance using your goals and budget','Reviewable campaign drafts before publishing','Keyword and audience suggestions for campaign planning','Social post generation within your plan’s monthly allowance','Weekly plain-English performance report delivered by email'].map(f => (
                <div key={f} style={{ display:'flex',alignItems:'flex-start',gap:12,marginBottom:12 }}>
                  <div style={{ width:20,height:20,borderRadius:'50%',background:'rgba(139,92,246,0.15)',border:'1px solid rgba(139,92,246,0.35)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:2 }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                  </div>
                  <span style={{ fontSize:14,color:'rgba(255,255,255,0.65)' }}>{f}</span>
                </div>
              ))}
              <div style={{ marginTop:32 }}>
                <Link href="/features" className="btn-primary">Explore Marketing features →</Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="section" style={{ background:'var(--dark-2)' }}>
        <div className="container">
          <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
            <span className="tag" style={{ marginBottom:20 }}>{siteContent.homepage_features_eyebrow || 'Full feature set'}</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>{siteContent.homepage_features_heading || 'Everything you need to dominate your market'}</h2>
            <p style={{ color:'rgba(255,255,255,0.4)',maxWidth:500,margin:'0 auto',fontSize:16 }}>{siteContent.homepage_features_description || 'Bring SEO, content and marketing workflows together in one workspace.'}</p>
          </ScrollReveal>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:18 }}>
            {[
              { icon:'🔍',title:'Full SEO Audit',desc:'Every page crawled and scored. Get exact fixes ranked by impact.',col:'#6366f1',d:0 },
              { icon:'🔑',title:'Keyword Research',desc:'100+ keywords found and ranked by traffic opportunity and difficulty.',col:'#8b5cf6',d:80 },
              { icon:'✍️',title:'AI Content Writing',desc:'Complete pages written with keywords naturally woven in. Publish immediately.',col:'#ec4899',d:160 },
              { icon:'📈',title:'Rank Tracking',desc:'Weekly position checks for all keywords. Alerts when you move up or down.',col:'#4ade80',d:0 },
              { icon:'🎯',title:'Competitor Analysis',desc:"See every keyword your competitors rank for. Take their traffic.",col:'#f59e0b',d:80 },
              { icon:'📢',title:'Google Ads AI',desc:'Write, launch, and optimise Google campaigns automatically.',col:'#60a5fa',d:160 },
              { icon:'📘',title:'Meta Ads AI',desc:'Facebook and Instagram campaigns fully managed by AI.',col:'#818cf8',d:0 },
              { icon:'📱',title:'Social Media',desc:'20 platform-specific posts generated monthly. Copy, paste, publish.',col:'#f472b6',d:80 },
              { icon:'📊',title:'Weekly Reports',desc:'Plain-English email every Monday. No jargon. Just results.',col:'#34d399',d:160 },
              { icon:'⚡',title:'Page Speed',desc:'Identify and fix slow load times that hurt rankings and conversions.',col:'#fbbf24',d:0 },
              { icon:'🔗',title:'Link Building',desc:'AI identifies the best backlink opportunities for your niche.',col:'#fb7185',d:80 },
              { icon:'🏪',title:'Local SEO',desc:'Dominate local search for your city. Perfect for local businesses.',col:'#a78bfa',d:160 },
            ].map(f => (
              <ScrollReveal key={f.title} delay={f.d} type="up">
                <div className="glass-card" style={{ padding:'26px',height:'100%' }}>
                  <div style={{ width:42,height:42,borderRadius:12,background:`${f.col}18`,border:`1px solid ${f.col}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,marginBottom:16 }}>{f.icon}</div>
                  <h3 style={{ fontWeight:600,fontSize:15,marginBottom:8,color:'#fff' }}>{f.title}</h3>
                  <p style={{ fontSize:13,color:'rgba(255,255,255,0.42)',lineHeight:'1.65' }}>{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Verified testimonials are opt-in; never publish invented reviews. */}
      {testimonials.length > 0 && (
      <section className="section">
        <div className="container">
          <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
            <span className="tag" style={{ marginBottom:20 }}>{siteContent.homepage_testimonials_eyebrow || 'Customer stories'}</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>{siteContent.homepage_testimonials_heading || "Don't take our word for it"}</h2>
            <p style={{ color:'rgba(255,255,255,0.4)',maxWidth:460,margin:'0 auto',fontSize:16 }}>{siteContent.homepage_testimonials_description || 'Verified customer feedback will appear here as customers share their experience.'}</p>
          </ScrollReveal>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20 }}>
            {testimonials.map((t:any) => (
              <ScrollReveal key={t.n} delay={t.d}>
                <div className="glass-card" style={{ padding:'26px',height:'100%' }}>
                  <div style={{ display:'flex',gap:3,marginBottom:14 }}>{[1,2,3,4,5].map(i=><span key={i} style={{ color:'#fbbf24',fontSize:14 }}>★</span>)}</div>
                  <p style={{ fontSize:14,color:'rgba(255,255,255,0.65)',lineHeight:'1.75',marginBottom:20,fontStyle:'italic' }}>"{t.q}"</p>
                  <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                    <div style={{ width:38,height:38,borderRadius:'50%',background:`linear-gradient(135deg,${t.col},${t.col}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,color:'#fff',flexShrink:0 }}>{t.a}</div>
                    <div><p style={{ fontWeight:600,fontSize:14 }}>{t.n}</p><p style={{ fontSize:12,color:'rgba(255,255,255,0.35)' }}>{t.r}, {t.c}</p></div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* PRICING */}
      <section className="section" id="pricing" style={{ background:'var(--dark-2)' }}>
        <div className="container">
          <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
            <span className="tag" style={{ marginBottom:20 }}>{siteContent.homepage_pricing_eyebrow || 'Pricing'}</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>{siteContent.homepage_pricing_heading || 'Way cheaper than any agency'}</h2>
            <p style={{ color:'rgba(255,255,255,0.4)',maxWidth:500,margin:'0 auto',fontSize:16 }}>{siteContent.homepage_pricing_description || 'Choose a plan that fits your workload. Start with a free trial and cancel any time.'}</p>
          </ScrollReveal>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20 }}>
            {[
              { name:'Starter',price:15,desc:'Essential SEO for one website',features:['1 website','5 SEO audits/month','10 AI content generations/month','Monthly rank tracking','Competitor analysis','Email support'],col:'#6366f1',popular:false },
              { name:'Growth',price:29,desc:'More capacity for growing businesses',features:['3 websites','15 SEO audits/month','30 AI content generations/month','Weekly rank tracking','Google Ads AI tools','10 social posts/month','Weekly reports'],col:'#8b5cf6',popular:true },
              { name:'Pro',price:59,desc:'Advanced marketing for active teams',features:['5 websites','40 SEO audits/month','80 AI content generations/month','Google + Meta Ads AI tools','30 social posts/month','Branded PDF reports'],col:'#ec4899',popular:false },
              { name:'Agency',price:99,desc:'Higher limits for agency workflows',features:['10 websites','100 SEO audits/month','200 AI content generations/month','Google + Meta Ads AI tools','100 social posts/month','Branded PDF reports'],col:'#f59e0b',popular:false },
            ].map((plan,i) => (
              <ScrollReveal key={plan.name} delay={i*80} type="up">
                <div className={`pricing-card ${plan.popular?'popular':''}`} style={{ height:'100%',display:'flex',flexDirection:'column' }}>
                  {plan.popular && <div style={{ position:'absolute',top:-13,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',fontSize:11,fontWeight:700,padding:'4px 18px',borderRadius:100,letterSpacing:'0.06em',whiteSpace:'nowrap' }}>MOST POPULAR</div>}
                  <p style={{ fontSize:11,fontWeight:700,color:plan.col,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10 }}>{plan.name}</p>
                  <div style={{ display:'flex',alignItems:'baseline',gap:4,marginBottom:8 }}>
                    <span style={{ fontSize:44,fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>${plan.price}</span>
                    <span style={{ color:'rgba(255,255,255,0.35)',fontSize:14 }}>/mo</span>
                  </div>
                  <p style={{ fontSize:13,color:'rgba(255,255,255,0.38)',marginBottom:24 }}>{plan.desc}</p>
                  <div style={{ height:1,background:'rgba(255,255,255,0.06)',marginBottom:24 }} />
                  <ul style={{ listStyle:'none',marginBottom:32,display:'flex',flexDirection:'column',gap:11,flex:1 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display:'flex',alignItems:'flex-start',gap:10,fontSize:13 }}>
                        <svg style={{ flexShrink:0,marginTop:2 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.col} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        <span style={{ color:'rgba(255,255,255,0.65)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={`/auth/signup?plan=${plan.name.toLowerCase()}&interval=monthly`} className="btn-primary" style={{ width:'100%',justifyContent:'center',background:plan.popular?'linear-gradient(135deg,#6366f1,#7c3aed)':'rgba(255,255,255,0.05)',boxShadow:plan.popular?undefined:'none',border:plan.popular?'none':'1px solid rgba(255,255,255,0.1)' }}>
                    Choose plan
                  </Link>
                </div>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal className="text-center" style={{ marginTop:36 }}>
            <p style={{ fontSize:13,color:'rgba(255,255,255,0.28)' }}>Free plan available · Paid plans from $15/month · Cancel any time · Secure hosted checkout when enabled</p>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container" style={{ maxWidth:760 }}>
          <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
            <span className="tag" style={{ marginBottom:20 }}>{siteContent.homepage_faq_eyebrow || 'FAQ'}</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{siteContent.homepage_faq_heading || 'Questions, answered'}</h2>
          </ScrollReveal>
          {readJsonList<any>(siteContent, 'homepage_faq_items_json', [
            { q:'Do I need any SEO knowledge to use RankPilot?',a:'Zero. RankPilot is built for business owners, not SEO experts. You paste your URL and AI does everything — audit, content, fix list. All reports are in plain English with no jargon.' },
            { q:'How is this different from hiring an SEO agency?',a:'RankPilot brings website audits, keyword research, AI-assisted content tools and reporting into one workspace. Available workflows and limits depend on your plan and connected services.' },
            { q:'How long does it take to see ranking improvements?',a:'SEO timelines vary with competition, website history, technical health and content quality. RankPilot helps identify issues and organise work, but search rankings are not guaranteed.' },
            { q:'Does RankPilot actually run my Google Ads, or just suggest things?',a:'RankPilot can help prepare campaign assets. Live campaign publishing depends on supported account connections, plan eligibility and configuration.' },
            { q:'Can I use RankPilot for multiple websites?',a:'Yes. Starter includes 1 website, Growth includes 3, Pro includes 5, and Agency includes 10 websites. Upgrade any time to add more.' },
            { q:'Will AI-generated content guarantee higher rankings?',a:'No tool can guarantee search rankings. RankPilot helps prepare content drafts around search intent and target keywords; results depend on competition, quality, website health and implementation.' },
            { q:'What happens to my data if I cancel?',a:'Your data stays in your account for 30 days after cancellation so you can export everything. We never sell your data to third parties. All website data is encrypted and stored securely.' },
          ] ).map((faq:any) => <FAQ key={faq.q} q={faq.q} a={faq.a} />)}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding:'80px 0 120px',background:'var(--dark-2)' }}>
        <div className="container">
          <ScrollReveal type="scale">
            <div style={{ textAlign:'center',maxWidth:680,margin:'0 auto',padding:'72px 40px',background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.06))',border:'1px solid rgba(99,102,241,0.22)',borderRadius:32,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:-100,left:'50%',transform:'translateX(-50%)',width:500,height:500,background:'radial-gradient(circle,rgba(99,102,241,0.12),transparent 65%)',pointerEvents:'none' }} />
              <span className="tag" style={{ marginBottom:24 }}>{siteContent.homepage_final_eyebrow || 'Start today'}</span>
              <h2 style={{ fontSize:'clamp(2rem,5vw,3.2rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.08,marginBottom:20 }}>
                {siteContent.homepage_final_heading || 'Build a clearer, more consistent SEO workflow.'}
              </h2>
              <p style={{ fontSize:16,color:'rgba(255,255,255,0.45)',marginBottom:44,lineHeight:1.75,maxWidth:500,margin:'0 auto 44px' }}>{siteContent.homepage_final_description || 'Start your 14-day Free Trial with no card required. It includes 1 website, 5 SEO audits/month, 10 AI content generations/month, 5 social posts/month, competitor analysis, and weekly rank tracking.'}</p>
              <div style={{ display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap' }}>
                <Link href="/auth/signup?flow=trial" className="btn-primary" style={{ fontSize:16,padding:'16px 36px' }}>
                  Start free trial
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
                <Link href="/pricing" className="btn-ghost" style={{ fontSize:16,padding:'16px 36px' }}>View pricing</Link>
              </div>
              <p style={{ marginTop:28,fontSize:13,color:'rgba(255,255,255,0.25)' }}>✓ 14-day free trial &nbsp;·&nbsp; ✓ No credit card &nbsp;·&nbsp; ✓ Cancel anytime</p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </>
  );
}

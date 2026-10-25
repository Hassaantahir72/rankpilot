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

const LOGOS = ['Google Ads','Meta Ads','Shopify','WordPress','Webflow','HubSpot','Stripe','Salesforce','Mailchimp','Zapier','Slack','Notion','WooCommerce','Wix'];

export default function HomePage() {
  return (
    <>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes borderPulse{0%,100%{border-color:rgba(99,102,241,0.25)}50%{border-color:rgba(99,102,241,0.6)}}
      `}</style>
      <Navbar />

      {/* HERO */}
      <section style={{ position:'relative',minHeight:'100vh',display:'flex',alignItems:'center',overflow:'hidden',paddingTop:80 }}>
        <GridBg />
        <div className="container" style={{ position:'relative',zIndex:1,textAlign:'center',paddingTop:80,paddingBottom:100 }}>
          <div className="animate-fade-up delay-0" style={{ marginBottom:24 }}>
            <span className="tag"><span style={{ width:7,height:7,borderRadius:'50%',background:'#4ade80',display:'inline-block',marginRight:2 }} />14-day free trial · No credit card required</span>
          </div>
          <h1 className="animate-fade-up delay-1" style={{ fontSize:'clamp(2.6rem,7vw,5.6rem)',fontWeight:900,lineHeight:1.06,letterSpacing:'-0.04em',marginBottom:28,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            Your AI-Powered<br />
            <TypingText words={['SEO Expert','Marketing Team','Ad Manager','Content Writer','Growth Engine']} />
          </h1>
          <p className="animate-fade-up delay-2" style={{ fontSize:'clamp(1rem,2vw,1.2rem)',color:'rgba(255,255,255,0.5)',maxWidth:580,margin:'0 auto 44px',lineHeight:1.75 }}>
            Paste your URL. RankPilot audits your SEO, writes optimized content, and helps prepare Google and Meta ad campaigns with AI-powered tools.
          </p>
          <div className="animate-fade-up delay-3" style={{ display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap',marginBottom:56 }}>
            <Link href="/auth/signup?flow=trial" className="btn-primary" style={{ fontSize:16,padding:'15px 32px' }}>
              Start free — no card needed
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </Link>
            <Link href="/features" className="btn-ghost" style={{ fontSize:16,padding:'15px 32px' }}>
              See how it works
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16 10,8"/></svg>
            </Link>
          </div>
          {/* Social proof */}
          <div className="animate-fade-up delay-4" style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:24,flexWrap:'wrap' }}>
            <div style={{ display:'flex' }}>
              {['#6366f1','#8b5cf6','#ec4899','#f59e0b','#4ade80'].map((c,i) => (
                <div key={i} style={{ width:34,height:34,borderRadius:'50%',background:c,border:'2px solid #08080f',marginLeft:i?-10:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff' }}>
                  {['A','B','C','D','E'][i]}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display:'flex',gap:2,marginBottom:4 }}>{[1,2,3,4,5].map(i=><span key={i} style={{ color:'#fbbf24',fontSize:14 }}>★</span>)}</div>
              <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)' }}>Trusted by 1,200+ businesses worldwide</p>
            </div>
            <div style={{ width:1,height:36,background:'rgba(255,255,255,0.1)' }} />
            <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)' }}>Average <span style={{ color:'#4ade80',fontWeight:600 }}>+340% organic traffic</span> in 90 days</p>
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

      {/* STATS */}
      <section className="section" style={{ background:'var(--dark-2)' }}>
        <div className="container">
          <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
            <span className="tag" style={{ marginBottom:20 }}>By the numbers</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Results that speak for themselves</h2>
          </ScrollReveal>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:20 }}>
            {[
              { num:1200,suffix:'+',label:'Businesses using RankPilot',col:'#6366f1' },
              { num:340,suffix:'%',label:'Avg traffic increase in 90 days',col:'#8b5cf6' },
              { num:50000,suffix:'+',label:'SEO audits completed',col:'#ec4899' },
              { num:98,suffix:'%',label:'Customer satisfaction rate',col:'#4ade80' },
            ].map((s,i) => (
              <ScrollReveal key={s.label} delay={i*100} type="scale">
                <div className="glass-card" style={{ padding:'36px 24px',textAlign:'center' }}>
                  <p style={{ fontSize:'3rem',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",color:s.col,lineHeight:1,marginBottom:10 }}>
                    <CountUp end={s.num} suffix={s.suffix} />
                  </p>
                  <p style={{ fontSize:14,color:'rgba(255,255,255,0.4)',lineHeight:1.55 }}>{s.label}</p>
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
            <span className="tag" style={{ marginBottom:20 }}>How it works</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:16 }}>
              From zero to ranking in <span className="gradient-text">3 steps</span>
            </h2>
            <p style={{ color:'rgba(255,255,255,0.45)',maxWidth:460,margin:'0 auto',fontSize:16 }}>No SEO knowledge needed. Start with one website and upgrade as your needs grow.</p>
          </ScrollReveal>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:40,position:'relative' }}>
            <div style={{ position:'absolute',top:22,left:'calc(33% + 20px)',right:'calc(33% + 20px)',height:1,background:'linear-gradient(90deg,rgba(99,102,241,0.5),rgba(99,102,241,0.1))' }} />
            {[
              { n:'1',title:'Paste your URL',desc:'Add your website URL and tell us your industry. Takes 30 seconds. No setup, no code, no configuration.' },
              { n:'2',title:'AI analyses everything',desc:'RankPilot crawls your entire site, researches 100+ keywords, checks competitors, and spots every issue.' },
              { n:'3',title:'Rankings climb automatically',desc:'We fix your SEO, write content, launch ads, and send you weekly plain-English reports every Monday.' },
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
              <span className="tag" style={{ marginBottom:20 }}>SEO Autopilot</span>
              <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.12,marginBottom:18 }}>Everything an SEO expert does — <span className="gradient-text">automated</span></h2>
              <p style={{ color:'rgba(255,255,255,0.45)',fontSize:15,lineHeight:1.8,marginBottom:32 }}>SEO agencies charge $2,000–$8,000/month. RankPilot does the same work automatically in minutes — full crawl, keyword research, content writing, rank tracking.</p>
              {['Full website crawl — every page audited and scored','AI researches 100+ keywords ranked by traffic opportunity','Page-by-page content rewrite with keywords naturally embedded','Competitor gap analysis — see what their traffic comes from','Weekly rank tracking with email alerts when positions change','Technical fixes: speed, schema markup, meta tags, broken links'].map(f => (
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
              <span className="tag" style={{ marginBottom:20 }}>Marketing Autopilot</span>
              <h2 style={{ fontSize:'clamp(1.8rem,3.5vw,2.6rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.12,marginBottom:18 }}>AI helps prepare campaigns like a <span className="gradient-text">marketing assistant</span></h2>
              <p style={{ color:'rgba(255,255,255,0.45)',fontSize:15,lineHeight:1.8,marginBottom:32 }}>Use AI tools to prepare Google and Meta campaign drafts and ad copy. Review campaign settings and approve changes before publishing.</p>
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
            <span className="tag" style={{ marginBottom:20 }}>Full feature set</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>Everything you need to dominate your market</h2>
            <p style={{ color:'rgba(255,255,255,0.4)',maxWidth:500,margin:'0 auto',fontSize:16 }}>One platform replaces your SEO agency, ad manager, content writer, and analytics team.</p>
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

      {/* TESTIMONIALS */}
      <section className="section">
        <div className="container">
          <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
            <span className="tag" style={{ marginBottom:20 }}>Customer stories</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>Don't take our word for it</h2>
            <p style={{ color:'rgba(255,255,255,0.4)',maxWidth:460,margin:'0 auto',fontSize:16 }}>1,200+ businesses replaced their agency with RankPilot.</p>
          </ScrollReveal>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20 }}>
            {[
              { q:"We cancelled our $4,000/month agency after the first audit. RankPilot found 34 issues they had missed for 8 months. Rankings jumped 40 positions in 6 weeks.",n:'Sarah Chen',r:'CEO',c:'NovaTech Solutions',a:'SC',col:'#6366f1',d:0 },
              { q:"As a dentist I have no time for marketing. RankPilot just runs everything. My Google Ads get 3x more leads at half the cost. My appointment book is full every week.",n:'Dr James Wilson',r:'Owner',c:'Wilson Dental',a:'JW',col:'#8b5cf6',d:100 },
              { q:"The AI content it writes is genuinely better than what our content team produced. We went from page 4 to page 1 for our main keyword in 11 weeks.",n:'Priya Sharma',r:'Marketing Director',c:'Growfast Agency',a:'PS',col:'#ec4899',d:200 },
              { q:"I run 6 e-commerce stores. Managing SEO across all of them was impossible. RankPilot handles all 6 automatically. Revenue is up 62% year over year.",n:'Marcus Johnson',r:'Founder',c:'MultiShop Group',a:'MJ',col:'#f59e0b',d:0 },
              { q:"The weekly reports alone are worth the price. Plain English, no jargon. I finally understand what is happening with my marketing and what the ROI is.",n:'Lisa Torres',r:'Operations Manager',c:'Bloom Retail',a:'LT',col:'#4ade80',d:100 },
              { q:"From 200 to 12,000 monthly organic visitors in 4 months. The SEO audit found everything. The content ranks better than anything we wrote manually.",n:'David Park',r:'Co-founder',c:'AppStack SaaS',a:'DP',col:'#60a5fa',d:200 },
            ].map(t => (
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

      {/* PRICING */}
      <section className="section" id="pricing" style={{ background:'var(--dark-2)' }}>
        <div className="container">
          <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
            <span className="tag" style={{ marginBottom:20 }}>Pricing</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>Way cheaper than any agency</h2>
            <p style={{ color:'rgba(255,255,255,0.4)',maxWidth:500,margin:'0 auto',fontSize:16 }}>Choose a plan that fits your workload. Start with a free trial and cancel any time.</p>
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
            <span className="tag" style={{ marginBottom:20 }}>FAQ</span>
            <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Questions, answered</h2>
          </ScrollReveal>
          {[
            { q:'Do I need any SEO knowledge to use RankPilot?',a:'Zero. RankPilot is built for business owners, not SEO experts. You paste your URL and AI does everything — audit, content, fix list. All reports are in plain English with no jargon.' },
            { q:'How is this different from hiring an SEO agency?',a:'Agencies charge $2,000–$8,000/month and spend much of that on account managers and overhead. RankPilot uses AI to do the actual work for a fraction of the price — with faster results and full transparency into exactly what was done.' },
            { q:'How long does it take to see ranking improvements?',a:'Most customers see ranking movement within 4–8 weeks of implementing the AI recommendations. Full first-page rankings for competitive keywords typically take 3–6 months, which is faster than most agencies achieve.' },
            { q:'Does RankPilot actually run my Google Ads, or just suggest things?',a:'Both. On eligible plans, RankPilot provides Google Ads and Meta Ads AI tools to help prepare campaign assets. Live campaign publishing depends on supported account connections and configuration.' },
            { q:'Can I use RankPilot for multiple websites?',a:'Yes. Starter includes 1 website, Growth includes 3, Pro includes 5, and Agency includes 10 websites. Upgrade any time to add more.' },
            { q:'Is the AI-generated content good enough to actually rank?',a:'Yes — and it is often better than manually written content because it is specifically engineered for search intent. Our AI uses your target keyword, related keywords, and competitor analysis to write content Google wants to rank. Customers regularly reach page 1 within 60–90 days of publishing.' },
            { q:'What happens to my data if I cancel?',a:'Your data stays in your account for 30 days after cancellation so you can export everything. We never sell your data to third parties. All website data is encrypted and stored securely.' },
          ].map(faq => <FAQ key={faq.q} q={faq.q} a={faq.a} />)}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding:'80px 0 120px',background:'var(--dark-2)' }}>
        <div className="container">
          <ScrollReveal type="scale">
            <div style={{ textAlign:'center',maxWidth:680,margin:'0 auto',padding:'72px 40px',background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.06))',border:'1px solid rgba(99,102,241,0.22)',borderRadius:32,position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:-100,left:'50%',transform:'translateX(-50%)',width:500,height:500,background:'radial-gradient(circle,rgba(99,102,241,0.12),transparent 65%)',pointerEvents:'none' }} />
              <span className="tag" style={{ marginBottom:24 }}>Start today</span>
              <h2 style={{ fontSize:'clamp(2rem,5vw,3.2rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.08,marginBottom:20 }}>
                Replace your agency.<br /><span className="gradient-text">Keep the results.</span>
              </h2>
              <p style={{ fontSize:16,color:'rgba(255,255,255,0.45)',marginBottom:44,lineHeight:1.75,maxWidth:500,margin:'0 auto 44px' }}>Start your 14-day Free Trial with no card required. It includes 1 website, 5 SEO audits/month, 10 AI content generations/month, 5 social posts/month, competitor analysis, and weekly rank tracking.</p>
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

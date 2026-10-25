'use client';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';

const SEO_FEATURES = [
  { icon:'🔍', title:'Full Website Crawl', desc:'Every page on your site crawled, scored, and analysed. We find every broken link, missing tag, slow page, and duplicate content issue.' },
  { icon:'🔑', title:'AI Keyword Research', desc:'100+ keywords researched per website. Ranked by search volume, difficulty, and revenue potential. Organised by topic clusters.' },
  { icon:'✍️', title:'AI Content Writing', desc:'Complete page rewrites with keywords naturally woven in. Headline, meta description, H1, body, call-to-action — all generated and ready to publish.' },
  { icon:'📈', title:'Rank Tracking', desc:'Weekly position tracking for every keyword. Compare to previous week. Get email alerts when you enter the top 10 or drop unexpectedly.' },
  { icon:'🎯', title:'Competitor Gap Analysis', desc:"See every keyword your top 5 competitors rank for that you don't. Identify the fastest path to stealing their organic traffic." },
  { icon:'🔧', title:'Technical SEO Fixes', desc:'SSL checks, page speed analysis via Google PageSpeed API, schema markup recommendations, canonical tags, robots.txt, and sitemap validation.' },
  { icon:'🔗', title:'Link Building Ideas', desc:'AI identifies the best backlink opportunities for your industry. Guest post targets, directory listings, and partnership opportunities.' },
  { icon:'🏪', title:'Local SEO', desc:'Optimise for local search. Google Business Profile recommendations, local keyword targeting, and location-based content strategies.' },
  { icon:'📊', title:'SEO Score Dashboard', desc:'Every website gets an overall SEO score out of 100. Track improvement over time. See which changes had the biggest impact.' },
];

const ADS_FEATURES = [
  { icon:'📢', title:'Google Ads AI', desc:'Connect your Google Ads account and let AI write your campaigns. Headlines, descriptions, keywords, bidding strategy — all automated.' },
  { icon:'📘', title:'Meta Ads AI', desc:'Facebook and Instagram campaigns built by AI. Copy, targeting, creative brief, and budget allocation — all done for you.' },
  { icon:'🧪', title:'Automatic A/B Testing', desc:'AI creates multiple ad variations and continuously tests them. Winners get more budget. Losers get paused. No manual work.' },
  { icon:'🎯', title:'Smart Audience Targeting', desc:'AI recommends the best audiences for your business. Lookalike audiences, interest targeting, and retargeting strategies built automatically.' },
  { icon:'💰', title:'Budget Optimisation', desc:'AI monitors spend across campaigns and reallocates budget to the highest performing ads in real time.' },
  { icon:'📱', title:'Social Media Content', desc:'20 platform-specific posts generated every month. Instagram, Facebook, LinkedIn, Twitter — each optimised for that platform.' },
  { icon:'📊', title:'Performance Dashboard', desc:'All your campaigns in one place. Impressions, clicks, conversions, spend, CPL — updated daily with trend indicators.' },
  { icon:'📧', title:'Weekly Reports', desc:'Every Monday, a plain-English email explains what happened, what worked, and what is planned for next week. No jargon.' },
  { icon:'⚡', title:'Instant Campaign Launch', desc:'From brief to live campaign in minutes. AI writes the copy, you approve it, and it goes live — no agency waiting time.' },
];

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop: 100, background: '#08080f', minHeight: '100vh' }}>

        {/* Hero */}
        <section style={{ padding:'80px 0 100px', textAlign:'center', position:'relative' }}>
          <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(99,102,241,0.14),transparent)',pointerEvents:'none' }} />
          <div className="container" style={{ position:'relative',zIndex:1 }}>
            <div className="animate-fade-up" style={{ marginBottom:20 }}><span className="tag">Features</span></div>
            <h1 className="animate-fade-up delay-1" style={{ fontSize:'clamp(2.4rem,6vw,4rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'-0.03em',marginBottom:18,lineHeight:1.1 }}>
              Everything you need.<br /><span className="gradient-text">Nothing you don't.</span>
            </h1>
            <p className="animate-fade-up delay-2" style={{ fontSize:18,color:'rgba(255,255,255,0.45)',maxWidth:520,margin:'0 auto 44px',lineHeight:1.7 }}>
              Two complete modules. One platform. Replace your entire marketing stack.
            </p>
            <div className="animate-fade-up delay-3" style={{ display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap' }}>
              <Link href="/auth/signup" className="btn-primary" style={{ fontSize:16,padding:'14px 30px' }}>Start free trial →</Link>
              <Link href="/pricing" className="btn-ghost" style={{ fontSize:16,padding:'14px 30px' }}>See pricing</Link>
            </div>
          </div>
        </section>

        {/* SEO Features */}
        <section className="section" style={{ background:'var(--dark-2)' }}>
          <div className="container">
            <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
              <span className="tag" style={{ marginBottom:20 }}>Module 1</span>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>SEO Autopilot</h2>
              <p style={{ color:'rgba(255,255,255,0.4)',maxWidth:500,margin:'0 auto',fontSize:16 }}>Everything an SEO agency does — automated, faster, and cheaper.</p>
            </ScrollReveal>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20 }}>
              {SEO_FEATURES.map((f,i) => (
                <ScrollReveal key={f.title} delay={(i%3)*100} type="up">
                  <div className="glass-card" style={{ padding:'28px',height:'100%' }}>
                    <div style={{ fontSize:28,marginBottom:16 }}>{f.icon}</div>
                    <h3 style={{ fontWeight:600,fontSize:16,marginBottom:10,color:'#fff' }}>{f.title}</h3>
                    <p style={{ fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:'1.7' }}>{f.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Ads Features */}
        <section className="section">
          <div className="container">
            <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
              <span className="tag" style={{ marginBottom:20 }}>Module 2</span>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>Marketing Autopilot</h2>
              <p style={{ color:'rgba(255,255,255,0.4)',maxWidth:500,margin:'0 auto',fontSize:16 }}>AI runs your paid ads and social media like a senior marketing team.</p>
            </ScrollReveal>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20 }}>
              {ADS_FEATURES.map((f,i) => (
                <ScrollReveal key={f.title} delay={(i%3)*100} type="up">
                  <div className="glass-card" style={{ padding:'28px',height:'100%' }}>
                    <div style={{ fontSize:28,marginBottom:16 }}>{f.icon}</div>
                    <h3 style={{ fontWeight:600,fontSize:16,marginBottom:10,color:'#fff' }}>{f.title}</h3>
                    <p style={{ fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:'1.7' }}>{f.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow section */}
        <section className="section" style={{ background:'var(--dark-2)' }}>
          <div className="container">
            <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>How the full workflow works</h2>
            </ScrollReveal>
            <div style={{ maxWidth:700,margin:'0 auto' }}>
              {[
                { step:'01',title:'You add your website',desc:'Paste your URL, tell us your industry. RankPilot takes it from there.',col:'#6366f1' },
                { step:'02',title:'AI crawls and audits',desc:'Your full site is crawled. Every page is scored. Every issue is found and prioritised by impact.',col:'#8b5cf6' },
                { step:'03',title:'Keywords are researched',desc:'100+ keywords identified for your industry and location. Ranked by search volume, difficulty, and opportunity.',col:'#ec4899' },
                { step:'04',title:'Content is written',desc:'AI writes fully optimised content for each page — title, meta, H1, body, CTAs — with keywords woven in naturally.',col:'#f59e0b' },
                { step:'05',title:'Ads are launched',desc:'Google Ads and Meta Ads campaigns built with AI copy and smart targeting. You approve before anything goes live.',col:'#4ade80' },
                { step:'06',title:'Rankings are tracked weekly',desc:'Every Monday your keyword positions are checked. You get an email: what improved, what changed, what is next.',col:'#60a5fa' },
              ].map((s,i) => (
                <ScrollReveal key={s.step} delay={i*80} type="left">
                  <div style={{ display:'flex',gap:24,marginBottom:32,alignItems:'flex-start' }}>
                    <div style={{ width:48,height:48,borderRadius:'50%',background:`${s.col}18`,border:`1px solid ${s.col}35`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:s.col,flexShrink:0,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s.step}</div>
                    <div style={{ paddingTop:12 }}>
                      <h3 style={{ fontWeight:600,fontSize:16,marginBottom:6,color:'#fff' }}>{s.title}</h3>
                      <p style={{ fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:'1.7' }}>{s.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding:'80px 0 100px' }}>
          <div className="container">
            <ScrollReveal type="scale">
              <div style={{ textAlign:'center',padding:'72px 40px',background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.06))',border:'1px solid rgba(99,102,241,0.22)',borderRadius:32,position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:-80,left:'50%',transform:'translateX(-50%)',width:400,height:400,background:'radial-gradient(circle,rgba(99,102,241,0.12),transparent 65%)',pointerEvents:'none' }} />
                <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.1,marginBottom:18 }}>Try every feature free for 14 days</h2>
                <p style={{ fontSize:16,color:'rgba(255,255,255,0.45)',marginBottom:40 }}>No credit card. Full access. Cancel any time.</p>
                <Link href="/auth/signup" className="btn-primary" style={{ fontSize:16,padding:'15px 32px' }}>Start free trial →</Link>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

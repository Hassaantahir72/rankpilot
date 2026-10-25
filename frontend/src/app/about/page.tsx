'use client';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';
import CountUp from '@/components/ui/CountUp';

const TEAM = [
  { name:'Alex Rivera', role:'CEO & Co-founder', bio:'Former Head of Growth at a $50M SaaS. Built his first SEO tool at 19. Obsessed with making marketing accessible to every business.', avatar:'AR', color:'#6366f1' },
  { name:'Priya Nair', role:'CTO & Co-founder', bio:'Ex-Google engineer. Built ML systems at scale for 8 years. Leads all AI and infrastructure at RankPilot.', avatar:'PN', color:'#8b5cf6' },
  { name:'James Okafor', role:'Head of Product', bio:'10 years building SaaS products. Previously at HubSpot. Passionate about making complex tools feel effortless.', avatar:'JO', color:'#ec4899' },
  { name:'Sofia Chen', role:'Head of AI Research', bio:'PhD in NLP. Spent 5 years at a leading AI lab. Builds the models that power every piece of content RankPilot generates.', avatar:'SC', color:'#f59e0b' },
  { name:'Marcus Webb', role:'Head of Marketing', bio:'Scaled two B2B SaaS companies from $0 to $10M ARR. Our own best customer — uses RankPilot to run all of RankPilot\'s marketing.', avatar:'MW', color:'#4ade80' },
  { name:'Leila Hassan', role:'Head of Customer Success', bio:'Former agency founder. Managed SEO and ads for 80+ businesses. Ensures every RankPilot customer gets results.', avatar:'LH', color:'#60a5fa' },
];

const VALUES = [
  { icon:'🎯', title:'Results over reports', desc:'Agencies send you 50-page PDFs. We send you higher rankings and more leads. Everything we build is measured by actual business outcomes.' },
  { icon:'🔍', title:'Radical transparency', desc:'You always know exactly what we did, what it cost, and what it achieved. No black boxes, no hidden fees, no marketing fluff.' },
  { icon:'⚡', title:'Speed matters', desc:'Marketing moves fast. RankPilot moves faster. What agencies take weeks to do, we do in minutes — with better output.' },
  { icon:'🤝', title:'Built for everyone', desc:'A local dentist and a 50-person SaaS both deserve great marketing. We price and design for both — not just enterprise budgets.' },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop:100, background:'#08080f', minHeight:'100vh' }}>

        {/* Hero */}
        <section style={{ padding:'80px 0 100px', textAlign:'center', position:'relative' }}>
          <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(99,102,241,0.14),transparent)',pointerEvents:'none' }} />
          <div className="container" style={{ position:'relative',zIndex:1 }}>
            <div className="animate-fade-up" style={{ marginBottom:20 }}><span className="tag">About us</span></div>
            <h1 className="animate-fade-up delay-1" style={{ fontSize:'clamp(2.4rem,6vw,4rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'-0.03em',marginBottom:20,lineHeight:1.1 }}>
              We believe every business deserves<br /><span className="gradient-text">world-class marketing</span>
            </h1>
            <p className="animate-fade-up delay-2" style={{ fontSize:18,color:'rgba(255,255,255,0.45)',maxWidth:600,margin:'0 auto',lineHeight:1.75 }}>
              RankPilot was founded in 2023 by a team of ex-Google engineers and growth marketers who were tired of watching great businesses lose to bigger competitors who could afford bigger agencies.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section style={{ padding:'60px 0',background:'var(--dark-2)' }}>
          <div className="container">
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:20 }}>
              {[
                { num:1200,suffix:'+',label:'Businesses powered',col:'#6366f1' },
                { num:50000,suffix:'+',label:'Audits completed',col:'#8b5cf6' },
                { num:2023,suffix:'',label:'Founded',col:'#ec4899' },
                { num:6,suffix:'',label:'Team members',col:'#4ade80' },
              ].map((s,i) => (
                <ScrollReveal key={s.label} delay={i*80} type="scale">
                  <div className="glass-card" style={{ padding:'28px 20px',textAlign:'center' }}>
                    <p style={{ fontSize:'2.6rem',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",color:s.col,lineHeight:1,marginBottom:8 }}>
                      <CountUp end={s.num} suffix={s.suffix} />
                    </p>
                    <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)' }}>{s.label}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="section">
          <div className="container" style={{ maxWidth:800 }}>
            <ScrollReveal>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:32 }}>Our story</h2>
              <div style={{ display:'flex',flexDirection:'column',gap:20,fontSize:16,color:'rgba(255,255,255,0.6)',lineHeight:'1.85' }}>
                <p>In 2022, our co-founder Alex was running his third startup. He was paying $4,500/month to an SEO agency and $3,000/month to a digital marketing agency. After 6 months, organic traffic had barely moved and his Google Ads were burning money.</p>
                <p>When he dug in, he realised the agencies were doing work that AI could do better — and faster. Keyword research, content brief creation, ad copy, technical audits — all of it was systematisable. So he teamed up with Priya, who had spent 8 years building ML systems at Google, and they started building.</p>
                <p>RankPilot launched in early 2023 with 5 beta customers. Within 3 months, every one of them had cancelled their SEO agency. Within 6 months, we had 200 paying customers and $40,000 MRR — all from word of mouth.</p>
                <p>Today, over 1,200 businesses use RankPilot. From a dentist in Lahore who has never run an ad in his life, to a 50-person SaaS company managing 10 websites. Every one of them is getting better results than they got from agencies — at a fraction of the cost.</p>
                <p>We are just getting started.</p>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Values */}
        <section className="section" style={{ background:'var(--dark-2)' }}>
          <div className="container">
            <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>What we believe</h2>
            </ScrollReveal>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20 }}>
              {VALUES.map((v,i) => (
                <ScrollReveal key={v.title} delay={i*100} type="up">
                  <div className="glass-card" style={{ padding:'30px' }}>
                    <div style={{ fontSize:32,marginBottom:18 }}>{v.icon}</div>
                    <h3 style={{ fontWeight:700,fontSize:17,marginBottom:12,color:'#fff' }}>{v.title}</h3>
                    <p style={{ fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:'1.75' }}>{v.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="section">
          <div className="container">
            <ScrollReveal className="text-center" style={{ marginBottom:64 }}>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>The team</h2>
              <p style={{ color:'rgba(255,255,255,0.4)',fontSize:16 }}>Small team. Massive ambition.</p>
            </ScrollReveal>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:20 }}>
              {TEAM.map((member,i) => (
                <ScrollReveal key={member.name} delay={(i%3)*100} type="up">
                  <div className="glass-card" style={{ padding:'28px',display:'flex',gap:20,alignItems:'flex-start' }}>
                    <div style={{ width:52,height:52,borderRadius:'50%',background:`linear-gradient(135deg,${member.color},${member.color}88)`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16,color:'#fff',flexShrink:0 }}>{member.avatar}</div>
                    <div>
                      <p style={{ fontWeight:700,fontSize:16,marginBottom:4 }}>{member.name}</p>
                      <p style={{ fontSize:12,color:member.color,fontWeight:600,marginBottom:10,textTransform:'uppercase',letterSpacing:'0.05em' }}>{member.role}</p>
                      <p style={{ fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:'1.65' }}>{member.bio}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Join CTA */}
        <section style={{ padding:'0 0 100px' }}>
          <div className="container">
            <ScrollReveal type="scale">
              <div style={{ textAlign:'center',padding:'72px 40px',background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.06))',border:'1px solid rgba(99,102,241,0.22)',borderRadius:32,position:'relative',overflow:'hidden' }}>
                <div style={{ position:'absolute',top:-80,left:'50%',transform:'translateX(-50%)',width:400,height:400,background:'radial-gradient(circle,rgba(99,102,241,0.12),transparent 65%)',pointerEvents:'none' }} />
                <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.1,marginBottom:18 }}>Join 1,200+ businesses<br />growing with RankPilot</h2>
                <p style={{ fontSize:16,color:'rgba(255,255,255,0.45)',marginBottom:40 }}>14-day free trial. No credit card. Cancel any time.</p>
                <div style={{ display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap' }}>
                  <Link href="/auth/signup" className="btn-primary" style={{ fontSize:16,padding:'15px 32px' }}>Start free trial →</Link>
                  <Link href="/careers" className="btn-ghost" style={{ fontSize:16,padding:'15px 32px' }}>Join our team</Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

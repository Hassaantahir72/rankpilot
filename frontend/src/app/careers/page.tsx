import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';

const ROLES = [
  { title:'Senior Full-Stack Engineer', dept:'Engineering', type:'Full-time · Remote', desc:'Build the core product — SEO crawlers, AI pipelines, dashboard. Node.js, React, Supabase.', color:'#6366f1' },
  { title:'AI/ML Engineer', dept:'AI Research', type:'Full-time · Remote', desc:'Improve our content generation and SEO analysis models. Python, LLMs, fine-tuning.', color:'#8b5cf6' },
  { title:'Product Designer', dept:'Design', type:'Full-time · Remote', desc:'Design the next generation of the RankPilot dashboard. Figma, design systems, user research.', color:'#ec4899' },
  { title:'Growth Marketer', dept:'Marketing', type:'Full-time · Remote', desc:'Own RankPilot\'s customer acquisition. SEO, paid ads, content, partnerships. Our own best customer.', color:'#f59e0b' },
  { title:'Customer Success Manager', dept:'Customer Success', type:'Full-time · Remote', desc:'Help customers get results. Onboarding, training, retention. Marketing background preferred.', color:'#4ade80' },
];

const PERKS = [
  { icon:'🌍', title:'Fully remote', desc:'Work from anywhere. We have team members across 6 countries.' },
  { icon:'💰', title:'Competitive salary', desc:'Top 10% salaries for your location, plus equity from day one.' },
  { icon:'🏖️', title:'Unlimited PTO', desc:'We trust you. Take time when you need it.' },
  { icon:'💻', title:'$3,000 equipment budget', desc:'Get the setup you need to do your best work.' },
  { icon:'📚', title:'$2,000 learning budget', desc:'Courses, books, conferences — whatever helps you grow.' },
  { icon:'🏥', title:'Health insurance', desc:'Full coverage for you and your family (US, UK, EU).' },
];

export default function CareersPage() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop:100, background:'#08080f', minHeight:'100vh' }}>

        {/* Hero */}
        <section style={{ padding:'80px 0 80px', textAlign:'center', position:'relative' }}>
          <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(99,102,241,0.14),transparent)',pointerEvents:'none' }} />
          <div className="container" style={{ position:'relative',zIndex:1 }}>
            <div className="animate-fade-up" style={{ marginBottom:20 }}><span className="tag">Careers</span></div>
            <h1 className="animate-fade-up delay-1" style={{ fontSize:'clamp(2.4rem,6vw,3.8rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'-0.03em',marginBottom:20,lineHeight:1.1 }}>
              Help us give every business<br /><span className="gradient-text">world-class marketing</span>
            </h1>
            <p className="animate-fade-up delay-2" style={{ fontSize:18,color:'rgba(255,255,255,0.45)',maxWidth:540,margin:'0 auto',lineHeight:1.75 }}>
              We are a small, ambitious team building the future of AI-powered marketing. Remote-first, equity from day one, top-of-market pay.
            </p>
          </div>
        </section>

        {/* Perks */}
        <section className="section" style={{ background:'var(--dark-2)' }}>
          <div className="container">
            <ScrollReveal className="text-center" style={{ marginBottom:56 }}>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:12 }}>Why join RankPilot?</h2>
            </ScrollReveal>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20 }}>
              {PERKS.map((p,i) => (
                <ScrollReveal key={p.title} delay={(i%3)*100} type="up">
                  <div className="glass-card" style={{ padding:'26px' }}>
                    <div style={{ fontSize:28,marginBottom:14 }}>{p.icon}</div>
                    <h3 style={{ fontWeight:600,fontSize:16,marginBottom:8 }}>{p.title}</h3>
                    <p style={{ fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:'1.65' }}>{p.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Open roles */}
        <section className="section">
          <div className="container">
            <ScrollReveal className="text-center" style={{ marginBottom:56 }}>
              <h2 style={{ fontSize:'clamp(1.8rem,4vw,2.6rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:12 }}>Open roles</h2>
              <p style={{ color:'rgba(255,255,255,0.4)',fontSize:15 }}>All roles are fully remote unless stated otherwise.</p>
            </ScrollReveal>
            <div style={{ maxWidth:800,margin:'0 auto',display:'flex',flexDirection:'column',gap:16 }}>
              {ROLES.map((role,i) => (
                <ScrollReveal key={role.title} delay={i*80} type="left">
                  <div className="glass-card" style={{ padding:'28px 32px',display:'flex',alignItems:'center',gap:24,cursor:'pointer' }}>
                    <div style={{ width:44,height:44,borderRadius:12,background:`${role.color}18`,border:`1px solid ${role.color}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>
                      {role.dept==='Engineering'?'⚙️':role.dept==='AI Research'?'🧠':role.dept==='Design'?'🎨':role.dept==='Marketing'?'📢':'🤝'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:4,flexWrap:'wrap' }}>
                        <h3 style={{ fontWeight:600,fontSize:16,color:'#fff' }}>{role.title}</h3>
                        <span style={{ fontSize:11,fontWeight:700,color:role.color,background:`${role.color}18`,border:`1px solid ${role.color}28`,padding:'2px 10px',borderRadius:100,textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap' }}>{role.dept}</span>
                      </div>
                      <p style={{ fontSize:13,color:'rgba(255,255,255,0.35)',marginBottom:6 }}>{role.type}</p>
                      <p style={{ fontSize:14,color:'rgba(255,255,255,0.5)',lineHeight:1.6 }}>{role.desc}</p>
                    </div>
                    <Link href={`/contact?subject=careers&role=${encodeURIComponent(role.title)}`} className="btn-primary" style={{ whiteSpace:'nowrap',flexShrink:0,fontSize:13,padding:'10px 20px' }}>
                      Apply
                    </Link>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            <ScrollReveal className="text-center" style={{ marginTop:48 }}>
              <p style={{ fontSize:15,color:'rgba(255,255,255,0.4)',marginBottom:20 }}>Don't see your role? We still want to hear from you.</p>
              <Link href="/contact" className="btn-ghost">Send an open application</Link>
            </ScrollReveal>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

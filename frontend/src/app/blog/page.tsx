import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';

const POSTS = [
  { slug:'how-ai-is-replacing-seo-agencies', title:'How AI is replacing SEO agencies in 2024', excerpt:'The traditional SEO agency model is broken. Here is why AI does a better job — faster and at a fraction of the cost.', category:'SEO', date:'Jan 15, 2024', readTime:'8 min', color:'#6366f1', featured:true },
  { slug:'google-ads-automation-guide', title:'The complete guide to Google Ads automation with AI', excerpt:'Stop manually writing ad copy and tweaking bids. Here is how to let AI manage your entire Google Ads account.', category:'Ads', date:'Jan 8, 2024', readTime:'12 min', color:'#8b5cf6', featured:false },
  { slug:'seo-audit-checklist-2024', title:'The 47-point SEO audit checklist for 2024', excerpt:'Every issue you need to check. Every fix you need to make. The complete technical SEO audit guide.', category:'SEO', date:'Dec 28, 2023', readTime:'15 min', color:'#ec4899', featured:false },
  { slug:'local-seo-for-small-businesses', title:'Local SEO in 2024: The definitive guide for small businesses', excerpt:"How to rank number one in your city without an agency. Step-by-step guide covering everything from Google Business Profile to local link building.", category:'Local SEO', date:'Dec 20, 2023', readTime:'10 min', color:'#f59e0b', featured:false },
  { slug:'meta-ads-vs-google-ads', title:'Meta Ads vs Google Ads: Which is right for your business?', excerpt:'The honest answer: it depends. Here is exactly how to decide, with a decision framework for every type of business.', category:'Ads', date:'Dec 12, 2023', readTime:'9 min', color:'#4ade80', featured:false },
  { slug:'keyword-research-guide', title:'Keyword research in 2024: Stop guessing, start ranking', excerpt:'The keyword research process that got our customers 340% more organic traffic. No expensive tools required.', category:'SEO', date:'Dec 5, 2023', readTime:'11 min', color:'#60a5fa', featured:false },
  { slug:'content-seo-guide', title:'How to write content that ranks on page 1 every time', excerpt:'The exact framework our AI uses to write content that consistently outranks manual content. And how to apply it yourself.', category:'Content', date:'Nov 28, 2023', readTime:'13 min', color:'#f472b6', featured:false },
  { slug:'seo-roi-calculator', title:'How to calculate the ROI of SEO (with real examples)', excerpt:'Most businesses have no idea if their SEO is actually making money. Here is how to measure it properly.', category:'SEO', date:'Nov 20, 2023', readTime:'7 min', color:'#a78bfa', featured:false },
];

const CATS = ['All','SEO','Ads','Content','Local SEO'];

export default function BlogPage() {
  const featured = POSTS.find(p => p.featured);
  const rest = POSTS.filter(p => !p.featured);

  return (
    <>
      <Navbar />
      <div style={{ paddingTop:100, background:'#08080f', minHeight:'100vh' }}>

        {/* Hero */}
        <section style={{ padding:'80px 0 60px', textAlign:'center', position:'relative' }}>
          <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(99,102,241,0.14),transparent)',pointerEvents:'none' }} />
          <div className="container" style={{ position:'relative',zIndex:1 }}>
            <div className="animate-fade-up" style={{ marginBottom:20 }}><span className="tag">Blog</span></div>
            <h1 className="animate-fade-up delay-1" style={{ fontSize:'clamp(2.4rem,6vw,3.6rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'-0.03em',marginBottom:18,lineHeight:1.1 }}>
              Marketing insights from the<br /><span className="gradient-text">RankPilot team</span>
            </h1>
            <p className="animate-fade-up delay-2" style={{ fontSize:17,color:'rgba(255,255,255,0.45)',maxWidth:480,margin:'0 auto',lineHeight:1.7 }}>
              SEO tactics, ad strategies, and AI-powered marketing guides. Written by practitioners, not consultants.
            </p>
          </div>
        </section>

        <section style={{ padding:'40px 0 100px' }}>
          <div className="container">
            {/* Category filters */}
            <div style={{ display:'flex',gap:10,marginBottom:48,flexWrap:'wrap' }}>
              {CATS.map((c,i) => (
                <button key={c} style={{ padding:'8px 18px',borderRadius:100,border:'1px solid rgba(255,255,255,0.1)',background:i===0?'rgba(99,102,241,0.15)':'transparent',color:i===0?'#818cf8':'rgba(255,255,255,0.5)',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s' }}>
                  {c}
                </button>
              ))}
            </div>

            {/* Featured post */}
            {featured && (
              <ScrollReveal style={{ marginBottom:40 }}>
                <div className="glass-card" style={{ padding:0,overflow:'hidden' }}>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:0 }}>
                    <div style={{ background:`linear-gradient(135deg,${featured.color}22,${featured.color}08)`,padding:'52px 48px',display:'flex',flexDirection:'column',justifyContent:'center' }}>
                      <div style={{ display:'flex',gap:12,marginBottom:20,alignItems:'center' }}>
                        <span style={{ fontSize:11,fontWeight:700,color:featured.color,textTransform:'uppercase',letterSpacing:'0.08em' }}>{featured.category}</span>
                        <span style={{ color:'rgba(255,255,255,0.2)' }}>·</span>
                        <span style={{ fontSize:12,color:'rgba(255,255,255,0.35)' }}>{featured.readTime} read</span>
                        <span style={{ fontSize:11,fontWeight:700,color:'#f59e0b',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.2)',padding:'2px 10px',borderRadius:100 }}>FEATURED</span>
                      </div>
                      <h2 style={{ fontSize:'clamp(1.4rem,2.5vw,2rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.2,marginBottom:16 }}>{featured.title}</h2>
                      <p style={{ fontSize:15,color:'rgba(255,255,255,0.5)',lineHeight:1.7,marginBottom:28 }}>{featured.excerpt}</p>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                        <span style={{ fontSize:13,color:'rgba(255,255,255,0.3)' }}>{featured.date}</span>
                        <Link href={`/blog/${featured.slug}`} className="btn-primary" style={{ fontSize:14,padding:'10px 22px' }}>Read article →</Link>
                      </div>
                    </div>
                    <div style={{ background:`radial-gradient(circle at 40% 50%,${featured.color}18,transparent)`,display:'flex',alignItems:'center',justifyContent:'center',minHeight:280 }}>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontSize:80,marginBottom:16 }}>🚀</div>
                        <p style={{ fontSize:14,color:'rgba(255,255,255,0.3)' }}>Featured article</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Post grid */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:24 }}>
              {rest.map((post,i) => (
                <ScrollReveal key={post.slug} delay={(i%3)*80} type="up">
                  <Link href={`/blog/${post.slug}`} style={{ textDecoration:'none',display:'block',height:'100%' }}>
                    <div className="glass-card" style={{ padding:'28px',height:'100%',display:'flex',flexDirection:'column' }}>
                      <div style={{ display:'flex',gap:10,marginBottom:16,alignItems:'center' }}>
                        <span style={{ fontSize:11,fontWeight:700,color:post.color,textTransform:'uppercase',letterSpacing:'0.08em' }}>{post.category}</span>
                        <span style={{ color:'rgba(255,255,255,0.15)' }}>·</span>
                        <span style={{ fontSize:12,color:'rgba(255,255,255,0.3)' }}>{post.readTime} read</span>
                      </div>
                      <h3 style={{ fontWeight:700,fontSize:17,marginBottom:12,color:'#fff',lineHeight:1.35,flex:1 }}>{post.title}</h3>
                      <p style={{ fontSize:14,color:'rgba(255,255,255,0.42)',lineHeight:'1.65',marginBottom:20 }}>{post.excerpt}</p>
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:'auto' }}>
                        <span style={{ fontSize:13,color:'rgba(255,255,255,0.28)' }}>{post.date}</span>
                        <span style={{ fontSize:13,color:post.color,fontWeight:500 }}>Read →</span>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <section style={{ padding:'80px 0 100px',background:'var(--dark-2)' }}>
          <div className="container" style={{ maxWidth:600,textAlign:'center' }}>
            <ScrollReveal type="scale">
              <h2 style={{ fontSize:'clamp(1.6rem,3.5vw,2.2rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:14 }}>Get new articles in your inbox</h2>
              <p style={{ color:'rgba(255,255,255,0.4)',fontSize:15,marginBottom:32,lineHeight:1.7 }}>Weekly SEO and marketing insights. No spam ever.</p>
              <div style={{ display:'flex',gap:12,maxWidth:440,margin:'0 auto' }}>
                <input className="input-dark" placeholder="your@email.com" style={{ flex:1 }} />
                <button className="btn-primary" style={{ whiteSpace:'nowrap',flexShrink:0 }}>Subscribe</button>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

'use client';
import Link from 'next/link';
import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';
import AvailablePaymentMethods from '@/components/billing/AvailablePaymentMethods';

const PLANS = [
  {
    id:'starter', name:'Starter', monthly:15, annual:12, desc:'Essential SEO for one website', color:'#6366f1', popular:false,
    features:['1 website','5 SEO audits/month','10 AI content generations/month','Monthly rank tracking','Competitor analysis','Audit history & recommendations','Email support'],
    not:['Google Ads tools','Meta Ads tools','Social media posts'],
  },
  {
    id:'growth', name:'Growth', monthly:29, annual:23, desc:'More capacity for growing businesses', color:'#8b5cf6', popular:true,
    features:['3 websites','15 SEO audits/month','30 AI content generations/month','Weekly rank tracking','Competitor analysis','Google Ads AI tools','10 social posts/month','Weekly reports'],
    not:['Meta Ads tools'],
  },
  {
    id:'pro', name:'Pro', monthly:59, annual:47, desc:'Advanced marketing for active teams', color:'#ec4899', popular:false,
    features:['5 websites','40 SEO audits/month','80 AI content generations/month','Weekly rank tracking','Google + Meta Ads AI tools','30 social posts/month','Branded PDF reports'],
    not:[],
  },
  {
    id:'agency', name:'Agency', monthly:99, annual:79, desc:'Higher limits for agency workflows', color:'#f59e0b', popular:false,
    features:['10 websites','100 SEO audits/month','200 AI content generations/month','Weekly rank tracking','Google + Meta Ads AI tools','100 social posts/month','Branded PDF reports','Agency-level usage limits'],
    not:[],
  },
];

const TABLE = [
  {f:'Websites',s:'1',g:'3',p:'5',a:'10'},
  {f:'SEO Audits / month',s:'5',g:'15',p:'40',a:'100'},
  {f:'AI Content / month',s:'10',g:'30',p:'80',a:'200'},
  {f:'Rank Tracking',s:'Monthly',g:'Weekly',p:'Weekly',a:'Weekly'},
  {f:'Competitor Analysis',s:'✓',g:'✓',p:'✓',a:'✓'},
  {f:'Google Ads AI',s:'—',g:'✓',p:'✓',a:'✓'},
  {f:'Meta Ads AI',s:'—',g:'—',p:'✓',a:'✓'},
  {f:'Social Media Posts',s:'—',g:'10/mo',p:'30/mo',a:'100/mo'},
  {f:'Weekly Reports',s:'—',g:'✓',p:'✓',a:'✓'},
  {f:'Branded PDF Reports',s:'—',g:'—',p:'✓',a:'✓'},
];

function PricingFAQ({q,a}:{q:string;a:string}) {
  const [open,setOpen]=useState(false);
  return (
    <div className="faq-item">
      <button className="faq-btn" onClick={()=>setOpen(o=>!o)}>
        <span>{q}</span>
        <span style={{transition:'transform 0.3s',transform:open?'rotate(45deg)':'none',color:open?'#6366f1':'rgba(255,255,255,0.3)',fontSize:24,lineHeight:1,flexShrink:0,marginLeft:16}}>+</span>
      </button>
      <div className={`faq-body ${open?'open':''}`}>
        <p style={{fontSize:14,color:'rgba(255,255,255,0.5)',lineHeight:'1.8'}}>{a}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [annual,setAnnual]=useState(false);
  return (
    <>
      <Navbar/>
      <div style={{paddingTop:100,background:'#08080f',minHeight:'100vh'}}>
        {/* Hero */}
        <section style={{padding:'80px 0 80px',textAlign:'center',position:'relative'}}>
          <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(99,102,241,0.14),transparent)',pointerEvents:'none'}}/>
          <div className="container" style={{position:'relative',zIndex:1}}>
            <div className="animate-fade-up" style={{marginBottom:20}}><span className="tag">Pricing</span></div>
            <h1 className="animate-fade-up delay-1" style={{fontSize:'clamp(2.4rem,6vw,4rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'-0.03em',marginBottom:18,lineHeight:1.1}}>
              Way cheaper than any agency.<br/><span className="gradient-text">Way more powerful.</span>
            </h1>
            <p className="animate-fade-up delay-2" style={{fontSize:18,color:'rgba(255,255,255,0.45)',maxWidth:520,margin:'0 auto 40px',lineHeight:1.7}}>
              Choose your workspace plan or start with the separate 14-day Free Trial. Review billing details before secure payment.
            </p>
            <div className="animate-fade-up delay-3" style={{display:'inline-flex',alignItems:'center',gap:14,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'6px 8px 6px 16px'}}>
              <span style={{fontSize:14,fontWeight:500,color:!annual?'#fff':'rgba(255,255,255,0.4)'}}>Monthly</span>
              <button onClick={()=>setAnnual(a=>!a)} style={{width:44,height:24,borderRadius:100,background:annual?'#6366f1':'rgba(255,255,255,0.15)',border:'none',cursor:'pointer',position:'relative',transition:'background 0.3s',flexShrink:0}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:3,left:annual?23:3,transition:'left 0.3s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)'}}/>
              </button>
              <span style={{fontSize:14,fontWeight:500,color:annual?'#fff':'rgba(255,255,255,0.4)'}}>Annual</span>
              {annual&&<span style={{fontSize:11,fontWeight:700,color:'#4ade80',background:'rgba(74,222,128,0.12)',border:'1px solid rgba(74,222,128,0.25)',borderRadius:100,padding:'3px 10px'}}>Save up to 20%</span>}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section style={{padding:'0 0 100px'}}>
          <div className="container">
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:20,alignItems:'start'}}>
              {PLANS.map((plan,i)=>(
                <ScrollReveal key={plan.name} delay={i*80} type="up">
                  <div className={`pricing-card ${plan.popular?'popular':''}`} style={{display:'flex',flexDirection:'column'}}>
                    {plan.popular&&<div style={{position:'absolute',top:-13,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',fontSize:11,fontWeight:700,padding:'4px 20px',borderRadius:100,whiteSpace:'nowrap',letterSpacing:'0.06em'}}>MOST POPULAR</div>}
                    <p style={{fontSize:11,fontWeight:700,color:plan.color,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:10}}>{plan.name}</p>
                    <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:6}}>
                      <span style={{fontSize:46,fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1}}>${annual?plan.annual:plan.monthly}</span>
                      <span style={{color:'rgba(255,255,255,0.35)',fontSize:14}}>/mo</span>
                    </div>
                    {annual&&<p style={{fontSize:12,color:'#4ade80',marginBottom:4}}>Billed ${(annual?plan.annual:plan.monthly)*12}/yr</p>}
                    <p style={{fontSize:13,color:'rgba(255,255,255,0.38)',marginBottom:24,marginTop:6}}>{plan.desc}</p>
                    <div style={{height:1,background:'rgba(255,255,255,0.07)',marginBottom:22}}/>
                    <ul style={{listStyle:'none',marginBottom:28,display:'flex',flexDirection:'column',gap:10,flex:1}}>
                      {plan.features.map(f=>(
                        <li key={f} style={{display:'flex',alignItems:'flex-start',gap:10,fontSize:13}}>
                          <svg style={{flexShrink:0,marginTop:2}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          <span style={{color:'rgba(255,255,255,0.72)'}}>{f}</span>
                        </li>
                      ))}
                      {plan.not.map(f=>(
                        <li key={f} style={{display:'flex',alignItems:'flex-start',gap:10,fontSize:13,opacity:0.3}}>
                          <svg style={{flexShrink:0,marginTop:2}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          <span style={{color:'rgba(255,255,255,0.5)',textDecoration:'line-through'}}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={`/checkout?plan=${plan.id}&interval=${annual ? 'annual' : 'monthly'}`} className="btn-primary" style={{width:'100%',justifyContent:'center',background:plan.popular?'linear-gradient(135deg,#6366f1,#7c3aed)':'rgba(255,255,255,0.05)',boxShadow:plan.popular?undefined:'none',border:plan.popular?'none':'1px solid rgba(255,255,255,0.1)'}}>
                      Choose plan
                    </Link>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            <AvailablePaymentMethods />
            <ScrollReveal className="text-center" style={{marginTop:36}}>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>14-day Free Trial available without a card · Paid subscriptions start after secure checkout · Payment methods appear when configured</p>
            </ScrollReveal>
          </div>
        </section>

        {/* Comparison */}
        <section style={{padding:'80px 0',background:'#05050d'}}>
          <div className="container">
            <ScrollReveal className="text-center" style={{marginBottom:52}}>
              <h2 style={{fontSize:'clamp(1.6rem,3.5vw,2.4rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:12}}>Full comparison</h2>
            </ScrollReveal>
            <div style={{overflowX:'auto',borderRadius:16,border:'1px solid rgba(255,255,255,0.07)'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
                <thead>
                  <tr style={{background:'rgba(255,255,255,0.03)'}}>
                    <th style={{textAlign:'left',padding:'16px 20px',color:'rgba(255,255,255,0.35)',fontWeight:500,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>Feature</th>
                    {PLANS.map(p=>(
                      <th key={p.name} style={{textAlign:'center',padding:'16px 20px',fontWeight:700,fontSize:13,color:p.popular?'#818cf8':'rgba(255,255,255,0.7)',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>{p.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABLE.map((row,i)=>(
                    <tr key={row.f} style={{borderBottom:'1px solid rgba(255,255,255,0.04)',background:i%2===0?'rgba(255,255,255,0.01)':'transparent'}}>
                      <td style={{padding:'13px 20px',color:'rgba(255,255,255,0.6)',fontWeight:500}}>{row.f}</td>
                      {[row.s,row.g,row.p,row.a].map((v,j)=>(
                        <td key={j} style={{padding:'13px 20px',textAlign:'center',color:v==='✓'?'#4ade80':v==='—'?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.7)',fontWeight:v==='✓'?700:400}}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section style={{padding:'80px 0 60px'}}>
          <div className="container" style={{maxWidth:720}}>
            <ScrollReveal className="text-center" style={{marginBottom:52}}>
              <h2 style={{fontSize:'clamp(1.6rem,3.5vw,2.4rem)',fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Pricing questions</h2>
            </ScrollReveal>
            <PricingFAQ q="Is there a free trial?" a="RankPilot offers a separate 14-day Free Trial with no card required. Paid subscriptions begin only after you select a plan and complete checkout. Trial and paid-plan limits differ." />
            <PricingFAQ q="Can I change plans?" a="Yes, upgrade or downgrade any time from your account settings. Changes take effect immediately. Downgrades apply at the next billing cycle." />
            <PricingFAQ q="Do you offer refunds?" a="If you are not happy within the first 30 days, we will refund you in full — no questions asked. We want you to succeed." />
            <PricingFAQ q="What payment methods do you accept?" a="Available payment methods appear here when a provider is configured and has passed checkout and webhook verification. If no method is shown, please contact support while payments are being set up." />
            <PricingFAQ q="Can I cancel any time?" a="For active subscriptions, contact support if self-service cancellation is not available for your payment provider." />
          </div>
        </section>

        {/* CTA */}
        <section style={{padding:'0 0 100px'}}>
          <div className="container">
            <ScrollReveal type="scale">
              <div style={{textAlign:'center',padding:'72px 40px',background:'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.06))',border:'1px solid rgba(99,102,241,0.22)',borderRadius:32,position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:-80,left:'50%',transform:'translateX(-50%)',width:400,height:400,background:'radial-gradient(circle,rgba(99,102,241,0.12),transparent 65%)',pointerEvents:'none'}}/>
                <h2 style={{fontSize:'clamp(1.8rem,4vw,2.8rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1.1,marginBottom:18}}>Start your free trial today</h2>
                <p style={{fontSize:16,color:'rgba(255,255,255,0.55)',marginBottom:20,maxWidth:650,marginInline:'auto',lineHeight:1.7}}>14 days with no card required. The Free Trial is a separate plan with clear usage limits—not an automatic paid subscription.</p>
                <div style={{display:'flex',justifyContent:'center',gap:10,flexWrap:'wrap',marginBottom:32}}>{['1 website','5 audits/month','10 AI content/month','5 social posts/month','Competitor analysis','Weekly tracking'].map(item=><span key={item} style={{fontSize:12,padding:'8px 12px',borderRadius:100,border:'1px solid rgba(129,140,248,.25)',background:'rgba(99,102,241,.08)',color:'rgba(255,255,255,.75)'}}>{item}</span>)}</div>
                <div style={{display:'flex',gap:16,justifyContent:'center',flexWrap:'wrap'}}>
                  <Link href="/auth/signup?flow=trial" className="btn-primary" style={{fontSize:16,padding:'15px 32px'}}>Get started free →</Link>
                  <Link href="/contact" className="btn-ghost" style={{fontSize:16,padding:'15px 32px'}}>Talk to sales</Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </div>
      <Footer/>
    </>
  );
}

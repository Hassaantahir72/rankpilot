'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollReveal from '@/components/ui/ScrollReveal';
import api from '@/lib/api';

export default function ContactPage() {
  const [form, setForm] = useState({ name:'', email:'', company:'', subject:'general', message:'' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/contact', form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <Navbar />
      <div style={{ paddingTop:100, background:'#08080f', minHeight:'100vh' }}>
        <section style={{ padding:'80px 0 60px', textAlign:'center', position:'relative' }}>
          <div style={{ position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(99,102,241,0.14),transparent)',pointerEvents:'none' }} />
          <div className="container" style={{ position:'relative', zIndex:1 }}>
            <div className="animate-fade-up" style={{ marginBottom:20 }}><span className="tag">Contact</span></div>
            <h1 className="animate-fade-up delay-1" style={{ fontSize:'clamp(2.4rem,6vw,3.6rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'-0.03em',marginBottom:18,lineHeight:1.1 }}>Let's talk</h1>
            <p className="animate-fade-up delay-2" style={{ fontSize:18,color:'rgba(255,255,255,0.45)',maxWidth:480,margin:'0 auto',lineHeight:1.7 }}>
              Sales question, technical support, or partnership inquiry — we respond within 24 hours.
            </p>
          </div>
        </section>

        {/* Support options */}
        <section style={{ padding:'0 0 60px' }}>
          <div className="container">
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:60 }}>
              {[
                { icon:'🤖', title:'AI Chat', desc:'Instant answers 24/7', cta:'Start chat', color:'#6366f1', note:'Opens chat widget below' },
                { icon:'🎫', title:'Support Ticket', desc:'Track issues via email', cta:'Open ticket', color:'#8b5cf6', href:'/auth/signup' },
                { icon:'📧', title:'Email', desc:'hello@rankpilot.ai', cta:'Send email', color:'#4ade80', href:'mailto:hello@rankpilot.ai' },
                { icon:'💼', title:'Sales', desc:'sales@rankpilot.ai', cta:'Contact sales', color:'#f59e0b', href:'mailto:sales@rankpilot.ai' },
              ].map(card => (
                <ScrollReveal key={card.title} type="up">
                  <div className="glass-card" style={{ padding:24, textAlign:'center', cursor:'pointer' }}>
                    <div style={{ fontSize:32,marginBottom:14 }}>{card.icon}</div>
                    <h3 style={{ fontWeight:700,fontSize:15,marginBottom:6 }}>{card.title}</h3>
                    <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:16,lineHeight:1.5 }}>{card.desc}</p>
                    {card.href ? (
                      <a href={card.href} style={{ fontSize:13,color:card.color,fontWeight:600,textDecoration:'none' }}>{card.cta} →</a>
                    ) : (
                      <span style={{ fontSize:13,color:card.color,fontWeight:600 }}>{card.note}</span>
                    )}
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <div style={{ display:'grid',gridTemplateColumns:'1fr 1.6fr',gap:60,alignItems:'start' }}>
              {/* Left info */}
              <ScrollReveal type="left">
                <h2 style={{ fontSize:22,fontWeight:700,marginBottom:24 }}>Get in touch</h2>
                {[
                  { icon:'📧', label:'General', value:'hello@rankpilot.ai', href:'mailto:hello@rankpilot.ai' },
                  { icon:'💼', label:'Sales', value:'sales@rankpilot.ai', href:'mailto:sales@rankpilot.ai' },
                  { icon:'🛟', label:'Support', value:'support@rankpilot.ai', href:'mailto:support@rankpilot.ai' },
                  { icon:'🤝', label:'Partnerships', value:'partners@rankpilot.ai', href:'mailto:partners@rankpilot.ai' },
                ].map(item => (
                  <div key={item.label} style={{ display:'flex',gap:14,alignItems:'flex-start',marginBottom:22 }}>
                    <div style={{ width:38,height:38,borderRadius:10,background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0 }}>{item.icon}</div>
                    <div>
                      <p style={{ fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:3 }}>{item.label}</p>
                      <a href={item.href} style={{ fontSize:14,color:'#818cf8',textDecoration:'none' }}>{item.value}</a>
                    </div>
                  </div>
                ))}

                <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:20,marginTop:8 }}>
                  <p style={{ fontSize:13,fontWeight:700,marginBottom:10 }}>⏱ Support hours</p>
                  <div style={{ fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.8 }}>
                    <p>Mon – Fri: 9am – 6pm GMT</p>
                    <p>Sat: 10am – 2pm GMT</p>
                    <p>Urgent tickets: 24/7</p>
                  </div>
                </div>

                <div style={{ marginTop:16,background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.15)',borderRadius:14,padding:18 }}>
                  <p style={{ fontSize:13,fontWeight:600,color:'#a5b4fc',marginBottom:6 }}>💬 Chat with AI now</p>
                  <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.65 }}>Click the purple chat button in the bottom-right corner for instant AI support, 24/7.</p>
                </div>
              </ScrollReveal>

              {/* Contact form */}
              <ScrollReveal type="right">
                <div className="glass-card" style={{ padding:32 }}>
                  {submitted ? (
                    <div style={{ textAlign:'center',padding:'40px 0' }}>
                      <div style={{ fontSize:56,marginBottom:20 }}>✅</div>
                      <h3 style={{ fontSize:22,fontWeight:700,marginBottom:12 }}>Message sent!</h3>
                      <p style={{ fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.7,marginBottom:24 }}>We'll get back to you within 24 hours.</p>
                      <button onClick={() => { setSubmitted(false); setForm({ name:'',email:'',company:'',subject:'general',message:'' }); }}
                        style={{ padding:'10px 24px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:14,fontFamily:'inherit' }}>
                        Send another
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 style={{ fontSize:18,fontWeight:700,marginBottom:24 }}>Send us a message</h2>
                      {error && <div style={{ marginBottom:16,padding:'11px 14px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.22)',borderRadius:10,fontSize:13,color:'#fca5a5' }}>{error}</div>}
                      <form onSubmit={handleSubmit} style={{ display:'flex',flexDirection:'column',gap:16 }}>
                        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 }}>
                          <div>
                            <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Name *</label>
                            <input className="input-dark" value={form.name} onChange={set('name')} placeholder="John Smith" required />
                          </div>
                          <div>
                            <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Email *</label>
                            <input className="input-dark" type="email" value={form.email} onChange={set('email')} placeholder="john@company.com" required />
                          </div>
                        </div>
                        <div>
                          <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Company</label>
                          <input className="input-dark" value={form.company} onChange={set('company')} placeholder="Your company (optional)" />
                        </div>
                        <div>
                          <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Subject</label>
                          <select className="input-dark" value={form.subject} onChange={set('subject')}>
                            <option value="general">General inquiry</option>
                            <option value="sales">Sales / pricing</option>
                            <option value="technical">Technical support</option>
                            <option value="billing">Billing question</option>
                            <option value="partnership">Partnership</option>
                            <option value="press">Press / media</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display:'block',fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em' }}>Message *</label>
                          <textarea className="input-dark textarea-dark" value={form.message} onChange={set('message')} placeholder="Tell us how we can help..." required style={{ minHeight:120,resize:'vertical' }} />
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent:'center',fontSize:15,padding:'13px' }}>
                          {loading ? 'Sending...' : 'Send message →'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

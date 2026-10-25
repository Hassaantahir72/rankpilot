'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface Msg {
  role: 'user' | 'bot' | 'agent' | 'system';
  content: string;
  time: string;
  name?: string;
}

interface QuickReply {
  label: string;
  value: string;
}

const QUICK_STARTERS: QuickReply[] = [
  { label: '🔍 SEO not working', value: 'My SEO audit is not working properly' },
  { label: '💳 Billing question', value: 'I have a question about billing' },
  { label: '📢 Ads issue', value: 'I need help setting up my ad campaign' },
  { label: '🔑 Login problem', value: 'I cannot log into my account' },
  { label: '⚙️ Technical bug', value: 'I found a bug in the platform' },
  { label: '💬 Talk to human', value: 'I want to speak with a human agent' },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'bot' | 'queued' | 'live'>('bot');
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [unread, setUnread] = useState(0);
  const [agentForm, setAgentForm] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [ticketCreated, setTicketCreated] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  const addMsg = (role: Msg['role'], content: string, name?: string) => {
    const msg: Msg = { role, content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), name };
    setMessages(prev => [...prev, msg]);
    if (!open) setUnread(n => n + 1);
    return msg;
  };

  const openChat = () => {
    setOpen(true);
    setMinimized(false);
    if (messages.length === 0) {
      setTimeout(() => {
        addMsg('bot', "👋 Hi! I'm Alex, RankPilot's AI support assistant.\n\nI can help with SEO questions, billing, technical issues, and more. What brings you here today?", 'Alex (AI)');
        setQuickReplies(QUICK_STARTERS);
      }, 400);
    }
  };

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setQuickReplies([]);
    addMsg('user', msg);
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
      const { data } = await api.post('/support/chat', { message: msg, sessionToken, history });

      if (data.sessionToken) setSessionToken(data.sessionToken);
      if (data.sessionStatus) setStatus(data.sessionStatus);

      addMsg('bot', data.reply, 'Alex (AI)');
      if (data.quickReplies?.length) setQuickReplies(data.quickReplies.map((r: string) => ({ label: r, value: r })));

      if (data.escalate && !agentForm) {
        setTimeout(() => {
          addMsg('system', '🔄 Connecting you with a human agent...\nPlease share your name and email so we can follow up.');
          setAgentForm(true);
          setQuickReplies([]);
        }, 800);
      }
    } catch {
      addMsg('bot', "Sorry, I'm having trouble connecting. Please try again or create a support ticket.", 'Alex (AI)');
    }
    setLoading(false);
  }, [input, loading, messages, sessionToken, agentForm]);

  const handleAgentRequest = async () => {
    if (!agentName || !agentEmail) return;
    setAgentForm(false);
    setLoading(true);
    try {
      const { data } = await api.post('/support/chat/request-agent', {
        sessionToken, name: agentName, email: agentEmail, issue: messages.find(m => m.role === 'user')?.content,
      });
      setTicketCreated(data.ticketNumber);
      setStatus('queued');
      addMsg('system', `✅ You're in the queue!\n\nTicket #${data.ticketNumber} created. An agent will join this chat or email you within 2-4 hours.\n\nWe've sent a confirmation to ${agentEmail}.`);
    } catch {
      addMsg('system', 'Failed to connect to an agent. Please try creating a support ticket directly.');
    }
    setLoading(false);
  };

  const handleRating = async (stars: number) => {
    setRating(stars);
    addMsg('system', `Thanks for your ${stars}⭐ rating! We're glad we could help.`);
    setShowRating(false);
  };

  const endChat = () => {
    setShowRating(true);
    addMsg('system', 'How would you rate this support session?');
  };

  const roleColors: Record<string, string> = {
    user: '#6366f1', bot: '#8b5cf6', agent: '#4ade80', system: 'rgba(255,255,255,0.3)',
  };
  const roleBg: Record<string, string> = {
    user: 'linear-gradient(135deg,#6366f1,#7c3aed)',
    bot: 'rgba(139,92,246,0.12)',
    agent: 'rgba(74,222,128,0.1)',
    system: 'rgba(255,255,255,0.04)',
  };

  return (
    <>
      {/* Floating button */}
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999 }}>
        {!open && (
          <button onClick={openChat}
            style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#7c3aed)', border:'none', cursor:'pointer', boxShadow:'0 8px 32px rgba(99,102,241,0.5)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'all 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            {unread > 0 && (
              <div style={{ position:'absolute', top:-4, right:-4, width:20, height:20, borderRadius:'50%', background:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', border:'2px solid #08080f' }}>{unread}</div>
            )}
          </button>
        )}

        {/* Chat window */}
        {open && (
          <div style={{ position:'fixed', bottom:90, right:24, width:380, maxHeight:600, background:'#0d0d1a', border:'1px solid rgba(99,102,241,0.3)', borderRadius:20, boxShadow:'0 24px 80px rgba(0,0,0,0.6)', display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'inherit', zIndex:9999 }}>

            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,#6366f1,#7c3aed)', padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🤖</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:14, color:'#fff', marginBottom:2 }}>RankPilot Support</p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.75)', display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:status==='live'?'#4ade80':'#fbbf24', display:'inline-block' }}/>
                  {status==='live' ? 'Agent connected' : status==='queued' ? 'Waiting for agent...' : 'AI assistant online'}
                </p>
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => setMinimized(m => !m)} title="Minimize" style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', color:'#fff', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>─</button>
                <button onClick={() => setOpen(false)} title="Close" style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', color:'#fff', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div style={{ flex:1, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:12, maxHeight:380 }}>
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display:'flex', flexDirection:msg.role==='user'?'row-reverse':'row', gap:8, alignItems:'flex-end' }}>
                      {msg.role !== 'user' && (
                        <div style={{ width:28, height:28, borderRadius:'50%', background:roleBg[msg.role], border:`1px solid ${roleColors[msg.role]}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0, fontWeight:700, color:roleColors[msg.role] }}>
                          {msg.role==='bot'?'🤖':msg.role==='agent'?'👤':'ℹ'}
                        </div>
                      )}
                      <div style={{ maxWidth:'78%' }}>
                        {msg.role !== 'user' && msg.name && (
                          <p style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:4, fontWeight:600 }}>{msg.name}</p>
                        )}
                        <div style={{ padding:'10px 14px', borderRadius:msg.role==='user'?'18px 18px 4px 18px':'18px 18px 18px 4px', background:msg.role==='user'?'linear-gradient(135deg,#6366f1,#7c3aed)':msg.role==='system'?'rgba(255,255,255,0.04)':msg.role==='agent'?'rgba(74,222,128,0.08)':'rgba(255,255,255,0.06)', border:msg.role==='system'?'1px solid rgba(255,255,255,0.07)':msg.role==='agent'?'1px solid rgba(74,222,128,0.2)':'none', fontSize:13, color:'rgba(255,255,255,0.9)', lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                          {msg.content}
                        </div>
                        <p style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:3, textAlign:msg.role==='user'?'right':'left' }}>{msg.time}</p>
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(139,92,246,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>🤖</div>
                      <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.06)', borderRadius:'18px 18px 18px 4px' }}>
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(99,102,241,0.6)', animation:`bounce 1.4s ${i*0.2}s ease-in-out infinite` }}/>)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Star rating */}
                  {showRating && (
                    <div style={{ textAlign:'center', padding:'10px 0' }}>
                      <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => handleRating(s)} style={{ fontSize:24, background:'none', border:'none', cursor:'pointer', transition:'transform 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.transform='scale(1.3)')}
                            onMouseLeave={e => (e.currentTarget.style.transform='scale(1)')}>
                            {s <= rating ? '⭐' : '☆'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent form */}
                  {agentForm && (
                    <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:12, padding:14, display:'flex', flexDirection:'column', gap:10 }}>
                      <input value={agentName} onChange={e=>setAgentName(e.target.value)} placeholder="Your name" style={{ padding:'8px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
                      <input value={agentEmail} onChange={e=>setAgentEmail(e.target.value)} type="email" placeholder="Your email" style={{ padding:'8px 12px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, color:'#fff', fontSize:13, fontFamily:'inherit', outline:'none' }}/>
                      <button onClick={handleAgentRequest} disabled={!agentName||!agentEmail} style={{ padding:'9px', background:'linear-gradient(135deg,#6366f1,#7c3aed)', border:'none', borderRadius:8, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity:agentName&&agentEmail?1:0.5 }}>
                        Connect to agent →
                      </button>
                    </div>
                  )}

                  <div ref={bottomRef}/>
                </div>

                {/* Quick replies */}
                {quickReplies.length > 0 && !loading && !agentForm && (
                  <div style={{ padding:'0 14px 10px', display:'flex', flexWrap:'wrap', gap:6 }}>
                    {quickReplies.slice(0,6).map((qr, i) => (
                      <button key={i} onClick={() => send(qr.value)} style={{ padding:'6px 12px', background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:100, color:'#a5b4fc', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s', whiteSpace:'nowrap' }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(99,102,241,0.2)';}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(99,102,241,0.1)';}}>
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Ticket created banner */}
                {ticketCreated && (
                  <div style={{ margin:'0 14px 10px', padding:'10px 14px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                    <span style={{ fontSize:12, color:'#4ade80' }}>Ticket #{ticketCreated} created</span>
                    <Link href="/dashboard/support" style={{ fontSize:12, color:'#818cf8', textDecoration:'none', whiteSpace:'nowrap' }}>View →</Link>
                  </div>
                )}

                {/* Input */}
                <div style={{ padding:'10px 14px 14px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
                      placeholder={status==='queued'?'Waiting for agent...':'Type a message...'}
                      disabled={loading}
                      style={{ flex:1, padding:'10px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', transition:'border-color 0.2s' }}
                      onFocus={e=>(e.target.style.borderColor='rgba(99,102,241,0.5)')}
                      onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,0.1)')}/>
                    <button onClick={() => send()} disabled={!input.trim()||loading}
                      style={{ width:38, height:38, borderRadius:10, background:input.trim()&&!loading?'linear-gradient(135deg,#6366f1,#7c3aed)':'rgba(255,255,255,0.06)', border:'none', cursor:input.trim()&&!loading?'pointer':'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', flexShrink:0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4z"/></svg>
                    </button>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.2)' }}>Powered by Groq AI · <Link href="/dashboard/support" style={{ color:'rgba(99,102,241,0.6)', textDecoration:'none' }}>Open tickets</Link></p>
                    {messages.length > 3 && <button onClick={endChat} style={{ fontSize:10, color:'rgba(255,255,255,0.25)', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>End chat</button>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Floating button when chat is open */}
        {open && (
          <button onClick={() => setOpen(false)}
            style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#7c3aed)', border:'none', cursor:'pointer', boxShadow:'0 8px 32px rgba(99,102,241,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform:translateY(0); }
          40% { transform:translateY(-6px); }
        }
      `}</style>
    </>
  );
}

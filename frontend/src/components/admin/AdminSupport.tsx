'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type Tab = 'tickets'|'chats'|'stats';
const S_COLORS: Record<string,string> = {open:'#fbbf24',in_progress:'#818cf8',waiting_user:'#60a5fa',resolved:'#4ade80',closed:'rgba(255,255,255,0.3)'};
const P_COLORS: Record<string,string> = {low:'rgba(255,255,255,0.4)',normal:'#818cf8',high:'#f59e0b',urgent:'#ef4444'};

export default function AdminSupportPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [chats, setChats] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [sf, setSf] = useState('');
  const [pf, setPf] = useState('');
  const [af, setAf] = useState('');
  const [ns, setNs] = useState('');
  const [np, setNp] = useState('');
  const [canned, setCanned] = useState<any[]>([]);
  const [showCanned, setShowCanned] = useState(false);
  const [msg, setMsg] = useState('');
  const [loadError, setLoadError] = useState('');
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatReply, setChatReply] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !isAdmin) { router.push('/admin/login'); return; }
    if (isAdmin) { load().catch((e:any) => setLoadError(e.response?.data?.error || 'Could not load support data.')); }
  }, [isAdmin, loading]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);
  useEffect(() => { if (tab==='chats') loadChats().catch((e:any) => setLoadError(e.response?.data?.error || 'Could not load chat sessions.')); }, [tab]);
  useEffect(() => {
    if (!isAdmin || loading) return;
    const timer = window.setInterval(() => { load().catch((e:any) => setLoadError(e.response?.data?.error || 'Could not refresh support data.')); }, 30000);
    return () => window.clearInterval(timer);
  }, [isAdmin, loading, sf, pf, af]);

  const load = async () => {
    setLoadError('');
    const [statsRes, cannedRes] = await Promise.all([
      api.get('/support/admin/stats'),
      api.get('/support/admin/canned'),
    ]);
    setStats(statsRes.data);
    setCanned(cannedRes.data.responses || []);
    await loadTickets();
  };

  const loadTickets = async () => {
    const p: any = {};
    if (sf) p.status=sf; if (pf) p.priority=pf; if (af) p.assigned=af;
    const { data } = await api.get('/support/admin/tickets',{params:p});
    setTickets(data.tickets||[]);
  };

  const loadChats = async () => {
    setLoadError('');
    const { data } = await api.get('/support/admin/chats');
    setChats(data.sessions||[]);
  };

  const openTicket = async (id: string) => {
    try {
      const { data } = await api.get(`/support/admin/tickets/${id}`);
      setSelected(data.ticket); setMsgs(data.messages||[]); setNs(data.ticket.status); setNp(data.ticket.priority);
    } catch (err:any) { setLoadError(err.response?.data?.error || 'Could not open this support ticket.'); }
  };

  const openChat = async (id: string) => {
    try {
      setLoadError('');
      const { data } = await api.get(`/support/admin/chats/${id}`);
      setSelectedChat(data.session);
      setChatMessages(data.messages || []);
    } catch (err:any) { setLoadError(err.response?.data?.error || 'Could not open this chat session.'); }
  };

  const sendChatReply = async () => {
    if (!selectedChat || !chatReply.trim() || chatSending) return;
    setChatSending(true); setLoadError('');
    try {
      await api.post(`/support/admin/chats/${selectedChat.id}/reply`, { message: chatReply.trim() });
      setChatReply('');
      await openChat(selectedChat.id);
      await loadChats();
      setMsg('Reply sent. The customer chat is now connected to a human agent.');
    } catch (err:any) {
      setLoadError(err.response?.data?.error || 'Could not send the chat reply.');
    } finally { setChatSending(false); }
  };

  const sendReply = async () => {
    if (!reply.trim()||!selected) return;
    setSending(true);
    try {
      await api.post(`/support/admin/tickets/${selected.id}/reply`,{ message:reply.trim(), isInternal, status:ns!==selected.status?ns:undefined });
      setReply(''); setIsInternal(false);
      await openTicket(selected.id); await load();
      setMsg(isInternal?'Internal note added.':'Reply sent to user!');
    } catch (err: any) { setMsg(err.response?.data?.error||'Failed.'); }
    setSending(false);
  };

  const updateTicket = async () => {
    if (!selected) return;
    try {
      await api.patch(`/support/admin/tickets/${selected.id}`,{ status:ns, priority:np, assigned_to:user?.id });
      await openTicket(selected.id); await load(); setMsg('Ticket updated.');
    } catch (err:any) { setLoadError(err.response?.data?.error || 'Could not update the ticket.'); }
  };

  if (loading) return <div style={{color:'rgba(255,255,255,0.4)',padding:40}}>Loading...</div>;
  if (!isAdmin) return null;

  const TABS = [{id:'tickets',l:'Tickets',i:'🎫'},{id:'chats',l:'Live Chats',i:'💬'},{id:'stats',l:'Analytics',i:'📊'}] as const;

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🛟</div>
        <div><h1 style={{fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>Support Panel</h1><p style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>Tickets · Live chats · Analytics</p></div>
      </div>

      {loadError&&<div role="alert" style={{marginBottom:16,padding:'11px 16px',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:10,fontSize:13,color:'#fca5a5'}}>{loadError}</div>}
      {msg&&<div style={{marginBottom:16,padding:'11px 16px',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:10,fontSize:13,color:'#a5b4fc',display:'flex',justifyContent:'space-between'}}><span>{msg}</span><button onClick={()=>setMsg('')} style={{background:'none',border:'none',color:'inherit',cursor:'pointer'}}>✕</button></div>}

      {stats&&(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:12,marginBottom:24}}>
          {[{l:'Open',v:stats.open,c:'#fbbf24',i:'📂'},{l:'In Progress',v:stats.inProgress,c:'#818cf8',i:'⚙️'},{l:'Resolved',v:stats.resolved,c:'#4ade80',i:'✅'},{l:'Unassigned',v:stats.unassigned,c:'#ef4444',i:'⚠️'},{l:'Chat Queue',v:stats.queuedChats,c:'#60a5fa',i:'💬'}].map(s=>(
            <div key={s.l} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'14px 12px',textAlign:'center'}}>
              <div style={{fontSize:18,marginBottom:5}}>{s.i}</div>
              <p style={{fontSize:22,fontWeight:900,color:s.c,fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1}}>{s.v||0}</p>
              <p style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:3}}>{s.l}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:24,width:'fit-content'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as Tab)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit'}}>
            {t.i} {t.l}
          </button>
        ))}
      </div>

      {tab==='tickets'&&(
        <div style={{display:'grid',gridTemplateColumns:selected?'300px 1fr':'1fr',gap:18,alignItems:'start'}}>
          <div>
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
              {[['sf',sf,setSf,['','open','in_progress','waiting_user','resolved','closed'],['All','Open','In Progress','Waiting','Resolved','Closed']],
                ['pf',pf,setPf,['','low','normal','high','urgent'],['All Priorities','Low','Normal','High','Urgent']],
                ['af',af,setAf,['','me','unassigned'],['All Tickets','Mine','Unassigned']]
              ].map(([key,val,setter,opts,labels]: any)=>(
                <select key={key} className="input-dark" value={val} onChange={e=>setter(e.target.value)} style={{flex:1,minWidth:110,fontSize:12}}>
                  {(opts as string[]).map((o,i)=><option key={o} value={o}>{(labels as string[])[i]}</option>)}
                </select>
              ))}
              <button onClick={()=>loadTickets().catch((e:any)=>setLoadError(e.response?.data?.error||'Could not filter tickets.'))} style={{padding:'8px 14px',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,color:'#818cf8',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>Filter</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:560,overflowY:'auto'}}>
              {tickets.map(t=>(
                <div key={t.id} onClick={()=>openTicket(t.id)} style={{background:selected?.id===t.id?'rgba(99,102,241,0.08)':'rgba(255,255,255,0.02)',border:`1px solid ${selected?.id===t.id?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.07)'}`,borderRadius:11,padding:13,cursor:'pointer',transition:'all 0.2s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:6,marginBottom:5}}>
                    <p style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.85)',flex:1,lineHeight:1.4}}>{t.subject}</p>
                    <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:100,background:`${S_COLORS[t.status]}15`,color:S_COLORS[t.status],whiteSpace:'nowrap',flexShrink:0,textTransform:'capitalize'}}>{t.status.replace('_',' ')}</span>
                  </div>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',fontFamily:'monospace'}}>#{t.ticket_number}</span>
                    {(t.user_email||t.guest_email)&&<span style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{t.user_email||t.guest_email}</span>}
                    <span style={{fontSize:10,color:P_COLORS[t.priority],fontWeight:700,textTransform:'uppercase'}}>{t.priority}</span>
                    {!t.assigned_to&&<span style={{fontSize:10,color:'#ef4444',fontWeight:700}}>!</span>}
                  </div>
                </div>
              ))}
              {tickets.length===0&&<p style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'32px 0',fontSize:13}}>No tickets found.</p>}
            </div>
          </div>

          {selected&&(
            <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <p style={{fontSize:14,fontWeight:700,marginBottom:4}}>{selected.subject}</p>
                  <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.35)',fontFamily:'monospace'}}>#{selected.ticket_number}</span>
                    {(selected.user_name||selected.guest_name)&&<span style={{fontSize:11,color:'#818cf8'}}>{selected.user_name||selected.guest_name}{selected.user_plan?' · '+selected.user_plan+' plan':''}</span>}
                  </div>
                </div>
                <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:18}}>✕</button>
              </div>

              <div style={{padding:'10px 18px',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                <select value={ns} onChange={e=>setNs(e.target.value)} style={{padding:'5px 9px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#fff',fontSize:12,fontFamily:'inherit'}}>
                  {['open','in_progress','waiting_user','resolved','closed'].map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
                <select value={np} onChange={e=>setNp(e.target.value)} style={{padding:'5px 9px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'#fff',fontSize:12,fontFamily:'inherit'}}>
                  {['low','normal','high','urgent'].map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                <button onClick={updateTicket} style={{padding:'5px 12px',background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:7,color:'#818cf8',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>Update</button>
                <button onClick={()=>{const a=document.createElement('a');a.href=`mailto:${selected.guest_email||selected.user_email}`;a.click();}} style={{padding:'5px 12px',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'rgba(255,255,255,0.55)',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>📧 Email</button>
              </div>

              <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:12,maxHeight:300,overflowY:'auto'}}>
                {msgs.map((m,i)=>{
                  const isUser=m.sender_role==='user';
                  return (
                    <div key={i} style={{display:'flex',flexDirection:'column',alignItems:isUser?'flex-end':'flex-start'}}>
                      <div style={{maxWidth:'85%'}}>
                        <p style={{fontSize:10,color:'rgba(255,255,255,0.28)',marginBottom:3,fontWeight:600}}>
                          {m.sender_name}{m.sender_role==='agent'&&<span style={{color:'#4ade80',marginLeft:5}}>· Agent</span>}{m.is_internal&&<span style={{color:'#f59e0b',marginLeft:5}}>· Note</span>} · {new Date(m.created_at).toLocaleString()}
                        </p>
                        <div style={{padding:'9px 13px',borderRadius:11,background:isUser?'linear-gradient(135deg,#6366f1,#7c3aed)':m.is_internal?'rgba(245,158,11,0.07)':m.sender_role==='agent'?'rgba(74,222,128,0.07)':'rgba(255,255,255,0.04)',border:m.is_internal?'1px solid rgba(245,158,11,0.2)':m.sender_role==='agent'?'1px solid rgba(74,222,128,0.12)':'none',fontSize:12,color:'rgba(255,255,255,0.85)',lineHeight:1.65,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
                          {m.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}/>
              </div>

              {showCanned&&(
                <div style={{margin:'0 18px',background:'#0d0d1a',border:'1px solid rgba(99,102,241,0.2)',borderRadius:9,overflow:'hidden',maxHeight:160,overflowY:'auto'}}>
                  {canned.map(cr=>(
                    <button key={cr.id} onClick={()=>{setReply(cr.content);setShowCanned(false);}} style={{width:'100%',textAlign:'left',padding:'9px 13px',background:'transparent',border:'none',borderBottom:'1px solid rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.7)',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='rgba(99,102,241,0.08)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <span style={{color:'#818cf8',fontWeight:600,marginRight:6}}>{cr.shortcut}</span>{cr.title}
                    </button>
                  ))}
                </div>
              )}

              <div style={{padding:'12px 18px',borderTop:'1px solid rgba(255,255,255,0.07)'}}>
                <div style={{display:'flex',gap:8,marginBottom:8,alignItems:'center'}}>
                  <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'rgba(255,255,255,0.45)',cursor:'pointer'}}>
                    <input type="checkbox" checked={isInternal} onChange={e=>setIsInternal(e.target.checked)} style={{accentColor:'#f59e0b'}}/>Internal note
                  </label>
                  <button onClick={()=>setShowCanned(s=>!s)} style={{marginLeft:'auto',padding:'3px 10px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,color:'rgba(255,255,255,0.45)',cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>Canned</button>
                </div>
                <textarea value={reply} onChange={e=>setReply(e.target.value)} placeholder={isInternal?'Internal note...':'Reply to customer...'} rows={3}
                  style={{width:'100%',padding:'9px 13px',background:isInternal?'rgba(245,158,11,0.04)':'rgba(255,255,255,0.04)',border:`1px solid ${isInternal?'rgba(245,158,11,0.18)':'rgba(255,255,255,0.09)'}`,borderRadius:9,color:'#fff',fontSize:12,fontFamily:'inherit',outline:'none',resize:'vertical',boxSizing:'border-box',marginBottom:9}}/>
                <button onClick={sendReply} disabled={!reply.trim()||sending}
                  style={{padding:'8px 20px',background:isInternal?'rgba(245,158,11,0.12)':'linear-gradient(135deg,#6366f1,#7c3aed)',border:isInternal?'1px solid rgba(245,158,11,0.25)':'none',borderRadius:8,color:isInternal?'#fbbf24':'#fff',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'inherit',opacity:reply.trim()&&!sending?1:0.5}}>
                  {sending?'Sending...':(isInternal?'Add Note':'Send Reply →')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='chats'&&(
        <div style={{display:'grid',gridTemplateColumns:selectedChat?'minmax(260px,360px) minmax(0,1fr)':'1fr',gap:16,alignItems:'start'}}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
              <p style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>Queued requests and active human conversations</p>
              <button onClick={()=>loadChats().catch((e:any)=>setLoadError(e.response?.data?.error||'Could not refresh chats.'))} style={{padding:'7px 11px',background:'rgba(99,102,241,.12)',border:'1px solid rgba(99,102,241,.25)',borderRadius:8,color:'#a5b4fc',cursor:'pointer'}}>↻ Refresh</button>
            </div>
            {chats.length===0&&<p style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'40px 0',fontSize:13}}>No chat sessions.</p>}
            {chats.map(s=>(
              <button key={s.id} onClick={()=>openChat(s.id)} style={{textAlign:'left',background:selectedChat?.id===s.id?'rgba(99,102,241,.1)':'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:12,padding:14,color:'#fff',cursor:'pointer'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                  <span style={{width:8,height:8,borderRadius:'50%',background:s.status==='queued'?'#fbbf24':s.status==='live'?'#4ade80':'rgba(255,255,255,.3)'}}/>
                  <strong style={{fontSize:12,textTransform:'capitalize'}}>{s.status}</strong>
                  <span style={{marginLeft:'auto',fontSize:10,color:'rgba(255,255,255,.35)'}}>{s.message_count||0} messages</span>
                </div>
                <p style={{fontSize:12,color:'rgba(255,255,255,.72)'}}>{s.user_name||'Guest visitor'}{s.user_email?' · '+s.user_email:''}</p>
                <p style={{fontSize:10,color:'rgba(255,255,255,.3)',marginTop:5}}>Last activity: {new Date(s.last_message_at||s.started_at).toLocaleString()}</p>
                {s.ticket_id&&<span style={{display:'inline-block',marginTop:7,fontSize:10,color:'#a5b4fc'}}>Linked support ticket</span>}
              </button>
            ))}
          </div>
          {selectedChat&&(
            <section style={{background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,overflow:'hidden'}}>
              <header style={{padding:15,borderBottom:'1px solid rgba(255,255,255,.07)',display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}>
                <div><h3 style={{fontSize:14,fontWeight:700}}>Live conversation</h3><p style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:4}}>{selectedChat.user_name||'Guest visitor'}{selectedChat.user_email?' · '+selectedChat.user_email:''}</p></div>
                <span style={{fontSize:11,color:selectedChat.status==='live'?'#4ade80':selectedChat.status==='queued'?'#fbbf24':'#9ca3af',textTransform:'capitalize'}}>{selectedChat.status}</span>
              </header>
              <div style={{padding:15,maxHeight:430,overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
                {chatMessages.map(m=><div key={m.id} style={{alignSelf:m.sender_role==='user'?'flex-end':'flex-start',maxWidth:'88%'}}>
                  <p style={{fontSize:10,color:'rgba(255,255,255,.35)',marginBottom:3}}>{m.sender_name||m.sender_role} · {new Date(m.created_at).toLocaleString()}</p>
                  <div style={{padding:'9px 12px',borderRadius:10,background:m.sender_role==='user'?'rgba(99,102,241,.2)':m.sender_role==='agent'?'rgba(74,222,128,.09)':'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.06)',fontSize:12,lineHeight:1.6,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{m.message}</div>
                </div>)}
                {!chatMessages.length&&<p style={{fontSize:12,color:'rgba(255,255,255,.35)'}}>No messages recorded for this session.</p>}
              </div>
              <div style={{padding:14,borderTop:'1px solid rgba(255,255,255,.07)'}}>
                {selectedChat.status==='closed'?<p style={{fontSize:12,color:'rgba(255,255,255,.4)'}}>This chat session is closed.</p>:<>
                  <textarea value={chatReply} onChange={e=>setChatReply(e.target.value)} rows={3} maxLength={5000} placeholder="Reply to the customer. Sending the first reply connects this session to a human agent." style={{width:'100%',boxSizing:'border-box',padding:10,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',borderRadius:9,color:'#fff',fontSize:12,resize:'vertical'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8,gap:10}}><span style={{fontSize:10,color:'rgba(255,255,255,.3)'}}>Up to 5,000 characters</span><button onClick={sendChatReply} disabled={!chatReply.trim()||chatSending} style={{padding:'8px 15px',background:'linear-gradient(135deg,#6366f1,#7c3aed)',border:0,borderRadius:8,color:'#fff',cursor:'pointer',opacity:chatReply.trim()&&!chatSending?1:.5}}>{chatSending?'Sending…':'Send reply & take chat'}</button></div>
                </>}
              </div>
            </section>
          )}
        </div>
      )}

      {tab==='stats'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24}}>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:16}}>Ticket Breakdown</h3>
            {[{l:'Open',v:stats?.open||0,c:'#fbbf24'},{l:'In Progress',v:stats?.inProgress||0,c:'#818cf8'},{l:'Resolved',v:stats?.resolved||0,c:'#4ade80'},{l:'Unassigned',v:stats?.unassigned||0,c:'#ef4444'}].map(s=>{
              const tot=Math.max(1,(stats?.open||0)+(stats?.inProgress||0)+(stats?.resolved||0));
              return (
                <div key={s.l} style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                    <span style={{fontSize:13,color:'rgba(255,255,255,0.6)'}}>{s.l}</span>
                    <span style={{fontSize:13,fontWeight:600,color:s.c}}>{s.v}</span>
                  </div>
                  <div style={{height:5,background:'rgba(255,255,255,0.06)',borderRadius:100}}>
                    <div style={{height:'100%',width:`${Math.round((s.v/tot)*100)}%`,background:s.c,borderRadius:100}}/>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24}}>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:16}}>Measured service quality · last 30 days</h3>
            <div style={{marginBottom:18}}>
              <p style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Average first response</p>
              <p style={{fontSize:27,fontWeight:800,color:'#a5b4fc',marginTop:5}}>{stats?.averageFirstResponseMinutes == null ? 'No data yet' : stats.averageFirstResponseMinutes < 60 ? Math.round(stats.averageFirstResponseMinutes)+' min' : (stats.averageFirstResponseMinutes/60).toFixed(1)+' hrs'}</p>
            </div>
            <div style={{marginBottom:8}}>
              <p style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Customer satisfaction</p>
              <p style={{fontSize:27,fontWeight:800,color:'#4ade80',marginTop:5}}>{stats?.averageSatisfaction == null ? 'No ratings yet' : stats.averageSatisfaction.toFixed(1)+' / 5'}</p>
              <p style={{fontSize:10,color:'rgba(255,255,255,.3)',marginTop:3}}>{stats?.satisfactionResponses||0} customer ratings recorded</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

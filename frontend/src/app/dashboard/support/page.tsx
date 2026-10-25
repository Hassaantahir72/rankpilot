'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Tab = 'tickets' | 'new' | 'chat';

const STATUS_COLORS: Record<string,string> = { open:'#fbbf24', in_progress:'#818cf8', waiting_user:'#60a5fa', resolved:'#4ade80', closed:'rgba(255,255,255,0.3)' };
const PRIORITY_COLORS: Record<string,string> = { low:'rgba(255,255,255,0.4)', normal:'#818cf8', high:'#f59e0b', urgent:'#ef4444' };

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:100, background:`${STATUS_COLORS[status]}18`, color:STATUS_COLORS[status], textTransform:'capitalize', whiteSpace:'nowrap' }}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span style={{ fontSize:11, fontWeight:600, color:PRIORITY_COLORS[priority], textTransform:'capitalize' }}>
      {priority === 'urgent' ? '🔴' : priority === 'high' ? '🟡' : priority === 'normal' ? '🔵' : '⚪'} {priority}
    </span>
  );
}

export default function SupportPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('tickets');
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMsgs, setTicketMsgs] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [newForm, setNewForm] = useState({ subject:'', category:'general', priority:'normal', message:'' });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadTickets(); }, []);
  useEffect(() => {
    if (selectedTicket) loadTicket(selectedTicket.id);
  }, [selectedTicket?.id]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [ticketMsgs]);

  const loadTickets = async () => {
    setLoading(true);
    try { const { data } = await api.get('/support/tickets'); setTickets(data.tickets || []); }
    catch {}
    setLoading(false);
  };

  const loadTicket = async (id: string) => {
    try {
      const { data } = await api.get(`/support/tickets/${id}`);
      setSelectedTicket(data.ticket);
      setTicketMsgs(data.messages || []);
    } catch {}
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/reply`, { message: reply.trim() });
      setReply('');
      await loadTicket(selectedTicket.id);
      setMsg('Reply sent!');
    } catch (err: any) { setMsg(err.response?.data?.error || 'Failed to send reply.'); }
    setSendingReply(false);
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.subject || !newForm.message) return;
    setCreating(true);
    try {
      const { data } = await api.post('/support/tickets', newForm);
      setMsg(`✅ Ticket #${data.ticketNumber} created! We'll respond within 2-4 hours.`);
      setNewForm({ subject:'', category:'general', priority:'normal', message:'' });
      setTab('tickets');
      await loadTickets();
    } catch (err: any) { setMsg(err.response?.data?.error || 'Failed to create ticket.'); }
    setCreating(false);
  };

  const submitRating = async (stars: number) => {
    if (!selectedTicket) return;
    setRating(stars);
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/rate`, { rating: stars });
      await loadTicket(selectedTicket.id);
    } catch {}
  };

  const TABS = [
    { id:'tickets', label:'My Tickets', icon:'🎫' },
    { id:'new', label:'New Ticket', icon:'✏️' },
  ] as const;

  const roleStyle = (role: string) => ({
    user:   { bg:'linear-gradient(135deg,#6366f1,#7c3aed)', color:'#fff', align:'flex-end' },
    agent:  { bg:'rgba(74,222,128,0.08)', color:'rgba(255,255,255,0.85)', align:'flex-start' },
    bot:    { bg:'rgba(99,102,241,0.08)', color:'rgba(255,255,255,0.85)', align:'flex-start' },
    system: { bg:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.5)', align:'center' },
  }[role] || { bg:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.8)', align:'flex-start' });

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:24, fontWeight:800, fontFamily:"'Plus Jakarta Sans',sans-serif", marginBottom:4 }}>Support Center</h1>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>Get help from our AI assistant or human support team.</p>
      </div>

      {msg && (
        <div style={{ marginBottom:18, padding:'12px 16px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.22)', borderRadius:10, fontSize:13, color:'#4ade80', display:'flex', justifyContent:'space-between' }}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Help cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:28 }}>
        {[
          { icon:'🤖', title:'AI Chat', desc:'Instant answers from our AI', action:'Chat now', color:'#6366f1', onClick:() => document.dispatchEvent(new CustomEvent('openChat')) },
          { icon:'🎫', title:'Support Ticket', desc:'Track your issues over email', action:'New ticket', color:'#8b5cf6', onClick:() => setTab('new') },
          { icon:'📚', title:'Documentation', desc:'Guides and tutorials', action:'Browse docs', color:'#4ade80', href:'https://docs.rankpilot.ai' },
          { icon:'📹', title:'Video Tutorials', desc:'Watch step-by-step guides', action:'Watch now', color:'#f59e0b', href:'/blog' },
        ].map(card => (
          <div key={card.title} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20, cursor:'pointer', transition:'all 0.2s' }}
            onClick={card.onClick}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${card.color}40`}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'}>
            <div style={{ fontSize:28, marginBottom:10 }}>{card.icon}</div>
            <p style={{ fontWeight:700, fontSize:14, marginBottom:5 }}>{card.title}</p>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:12 }}>{card.desc}</p>
            <span style={{ fontSize:12, color:card.color, fontWeight:600 }}>{card.action} →</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', padding:4, borderRadius:12, marginBottom:24, width:'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 18px', borderRadius:9, border:'none', background:tab===t.id?'rgba(255,255,255,0.1)':'transparent', color:tab===t.id?'#fff':'rgba(255,255,255,0.45)', fontSize:13, fontWeight:tab===t.id?600:400, cursor:'pointer', fontFamily:'inherit', transition:'all 0.2s' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* TICKETS LIST */}
      {tab === 'tickets' && (
        <div style={{ display:'grid', gridTemplateColumns:selectedTicket?'300px 1fr':'1fr', gap:20, alignItems:'start' }}>
          {/* List */}
          <div>
            {loading && <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13, textAlign:'center', padding:32 }}>Loading...</p>}
            {!loading && tickets.length === 0 && (
              <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:40, textAlign:'center' }}>
                <div style={{ fontSize:40, marginBottom:14 }}>🎫</div>
                <p style={{ fontSize:14, color:'rgba(255,255,255,0.45)', marginBottom:6 }}>No tickets yet</p>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.25)', marginBottom:20 }}>Create a ticket to get help from our team</p>
                <button onClick={() => setTab('new')} style={{ padding:'9px 20px', background:'linear-gradient(135deg,#6366f1,#7c3aed)', border:'none', borderRadius:9, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                  Create ticket →
                </button>
              </div>
            )}
            {tickets.map(t => (
              <div key={t.id} onClick={() => setSelectedTicket(t)}
                style={{ background:selectedTicket?.id===t.id?'rgba(99,102,241,0.08)':'rgba(255,255,255,0.02)', border:`1px solid ${selectedTicket?.id===t.id?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.07)'}`, borderRadius:12, padding:16, marginBottom:10, cursor:'pointer', transition:'all 0.2s' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)', lineHeight:1.4, flex:1 }}>{t.subject}</p>
                  <StatusBadge status={t.status} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontFamily:'monospace' }}>#{t.ticket_number}</span>
                  <PriorityBadge priority={t.priority} />
                  <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                {t.satisfaction_rating && (
                  <p style={{ fontSize:11, color:'#fbbf24', marginTop:6 }}>{'⭐'.repeat(t.satisfaction_rating)}</p>
                )}
              </div>
            ))}
          </div>

          {/* Ticket detail */}
          {selectedTicket && (
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden' }}>
              {/* Ticket header */}
              <div style={{ padding:'18px 22px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'flex-start', gap:16, justifyContent:'space-between', flexWrap:'wrap' }}>
                <div>
                  <p style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>{selectedTicket.subject}</p>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.35)', fontFamily:'monospace' }}>#{selectedTicket.ticket_number}</span>
                    <StatusBadge status={selectedTicket.status} />
                    <PriorityBadge priority={selectedTicket.priority} />
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>{selectedTicket.category}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedTicket(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:18 }}>✕</button>
              </div>

              {/* Messages */}
              <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14, maxHeight:380, overflowY:'auto' }}>
                {ticketMsgs.map((m, i) => {
                  const s = roleStyle(m.sender_role);
                  return (
                    <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:s.align as any }}>
                      <div style={{ maxWidth:'85%' }}>
                        <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:4, fontWeight:600 }}>
                          {m.sender_name} · {new Date(m.created_at).toLocaleString()}
                          {m.sender_role === 'agent' && <span style={{ marginLeft:6, color:'#4ade80' }}>· Agent</span>}
                        </p>
                        <div style={{ padding:'10px 14px', borderRadius:12, background:s.bg, color:s.color, fontSize:13, lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                          {m.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}/>
              </div>

              {/* Rating for resolved tickets */}
              {selectedTicket.status === 'resolved' && !selectedTicket.satisfaction_rating && (
                <div style={{ padding:'14px 22px', borderTop:'1px solid rgba(255,255,255,0.07)', textAlign:'center' }}>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:10 }}>How was our support? Rate your experience:</p>
                  <div style={{ display:'flex', justifyContent:'center', gap:8 }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => submitRating(s)} style={{ fontSize:24, background:'none', border:'none', cursor:'pointer', transition:'transform 0.15s', filter:rating>=s?'none':'grayscale(1) opacity(0.4)' }}
                        onMouseEnter={e => { setRating(s); (e.currentTarget as HTMLElement).style.transform='scale(1.2)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; }}>
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply box */}
              {!['resolved','closed'].includes(selectedTicket.status) && (
                <div style={{ padding:'14px 22px', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
                  <textarea value={reply} onChange={e => setReply(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                    style={{ width:'100%', padding:'10px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'#fff', fontSize:13, fontFamily:'inherit', outline:'none', resize:'vertical', boxSizing:'border-box', marginBottom:10 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                    onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}/>
                  <button onClick={sendReply} disabled={!reply.trim() || sendingReply}
                    style={{ padding:'10px 22px', background:'linear-gradient(135deg,#6366f1,#7c3aed)', border:'none', borderRadius:9, color:'#fff', fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', opacity:reply.trim()&&!sendingReply?1:0.5 }}>
                    {sendingReply ? 'Sending...' : 'Send Reply →'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* NEW TICKET */}
      {tab === 'new' && (
        <div style={{ maxWidth:620 }}>
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:28 }}>
            <h2 style={{ fontSize:16, fontWeight:700, marginBottom:20 }}>Create Support Ticket</h2>
            <form onSubmit={createTicket} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.38)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Subject *</label>
                <input className="input-dark" value={newForm.subject} onChange={e => setNewForm(f => ({...f, subject:e.target.value}))} placeholder="Brief description of your issue" required/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.38)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Category</label>
                  <select className="input-dark" value={newForm.category} onChange={e => setNewForm(f => ({...f, category:e.target.value}))}>
                    {[['general','General'],['billing','Billing'],['technical','Technical'],['seo','SEO'],['ads','Ads'],['feature','Feature Request'],['bug','Bug Report'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.38)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Priority</label>
                  <select className="input-dark" value={newForm.priority} onChange={e => setNewForm(f => ({...f, priority:e.target.value}))}>
                    {[['low','Low'],['normal','Normal'],['high','High'],['urgent','Urgent']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.38)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Message *</label>
                <textarea className="input-dark" value={newForm.message} onChange={e => setNewForm(f => ({...f, message:e.target.value}))}
                  placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, or relevant account information."
                  rows={5} style={{ resize:'vertical' }} required/>
              </div>
              <div style={{ display:'flex', gap:12 }}>
                <button type="submit" disabled={creating} style={{ padding:'11px 24px', background:'linear-gradient(135deg,#6366f1,#7c3aed)', border:'none', borderRadius:10, color:'#fff', fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  {creating ? 'Creating...' : 'Submit Ticket →'}
                </button>
                <button type="button" onClick={() => setTab('tickets')} style={{ padding:'11px 24px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'rgba(255,255,255,0.6)', fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* SLA info */}
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:22, marginTop:16 }}>
            <h3 style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>⏱ Response Times</h3>
            {[
              { priority:'Urgent', time:'< 1 hour', color:'#ef4444' },
              { priority:'High', time:'2-4 hours', color:'#f59e0b' },
              { priority:'Normal', time:'4-8 hours', color:'#818cf8' },
              { priority:'Low', time:'24 hours', color:'rgba(255,255,255,0.4)' },
            ].map(s => (
              <div key={s.priority} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize:13, color:s.color, fontWeight:600 }}>{s.priority}</span>
                <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>{s.time}</span>
              </div>
            ))}
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:12 }}>Mon-Fri, 9am-6pm GMT. Urgent tickets are handled 24/7.</p>
          </div>
        </div>
      )}
    </div>
  );
}

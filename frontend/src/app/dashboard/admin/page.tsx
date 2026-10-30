'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';

type Tab = 'overview'|'users'|'settings'|'security'|'contacts'|'billing'|'payment-methods'|'log';

function StatCard({ icon, label, value, color, sub }: any) {
  return (
    <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'20px 18px' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10 }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        <span style={{ fontSize:26,fontWeight:900,color,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{value}</span>
      </div>
      <p style={{ fontSize:13,color:'rgba(255,255,255,0.5)',fontWeight:500 }}>{label}</p>
      {sub && <p style={{ fontSize:11,color:'rgba(255,255,255,0.28)',marginTop:3 }}>{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [growth, setGrowth] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [contacts, setContacts] = useState<any[]>([]);
  const [billing, setBilling] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [secEvents, setSecEvents] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [trialDays, setTrialDays] = useState('14');
  const [banReason, setBanReason] = useState('');
  const [newIP, setNewIP] = useState('');
  const [newIPReason, setNewIPReason] = useState('');
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok');
  const [settingEdits, setSettingEdits] = useState<Record<string,string>>({});
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [newProvider, setNewProvider] = useState('safepay');
  const [newMethodName, setNewMethodName] = useState('Safepay');
  const [newMethodDescription, setNewMethodDescription] = useState('Pakistan-focused payments');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!loading && !isAdmin) { router.push('/dashboard'); return; }
    if (isAdmin) { loadStats().catch((e:any) => setLoadError(e.response?.data?.error || 'Could not load admin overview.')); }
  }, [isAdmin, loading]);

  useEffect(() => {
    if (!isAdmin || loading) return;
    const timer = window.setInterval(() => { refreshCurrentTab(); }, 30000);
    return () => window.clearInterval(timer);
  }, [tab, isAdmin, loading, search, planFilter, statusFilter, bannedFilter]);

  useEffect(() => {
    const load = async () => {
      setLoadError('');
      try {
        if (tab === 'users') await loadUsers();
        if (tab === 'contacts') await loadContacts();
        if (tab === 'billing') await loadBilling();
        if (tab === 'payment-methods' && isAdmin) await loadPaymentMethods();
        if (tab === 'log') await loadAuditLog();
        if (tab === 'settings' && isAdmin) await loadSettings();
        if (tab === 'security') { await loadSecEvents(); if (isAdmin) await loadBlockedIPs(); }
      } catch (e:any) { setLoadError(e.response?.data?.error || 'Could not load this admin section.'); }
    };
    load();
  }, [tab]);

  const refreshCurrentTab = async () => {
    setRefreshing(true); setLoadError('');
    try {
      if (tab === 'overview') await loadStats();
      else if (tab === 'users') await loadUsers();
      else if (tab === 'contacts') await loadContacts();
      else if (tab === 'billing') await loadBilling();
      else if (tab === 'payment-methods') await loadPaymentMethods();
      else if (tab === 'log') await loadAuditLog();
      else if (tab === 'settings') await loadSettings();
      else if (tab === 'security') { await loadSecEvents(); await loadBlockedIPs(); }
      setLastUpdated(new Date());
    } catch (e:any) { setLoadError(e.response?.data?.error || 'Could not refresh this section.'); }
    finally { setRefreshing(false); }
  };

  const showMsg = (text: string, type: 'ok'|'err' = 'ok') => { setMsg(text); setMsgType(type); setTimeout(() => setMsg(''), 6000); };

  const loadStats  = async () => { const [s,g] = await Promise.all([adminApi.getStats(), adminApi.getGrowth()]); setStats(s.data); setGrowth(g.data); setLastUpdated(new Date()); };
  const loadUsers  = async () => {
    try {
      const p: any = {};
      if (search) p.search = search;
      if (planFilter) p.plan = planFilter;
      if (statusFilter) p.status = statusFilter;
      if (bannedFilter) p.banned = bannedFilter;
      const { data } = await adminApi.getUsers(p);
      setUsers(data.users || []); setUserTotal(data.total || 0);
    } catch (e:any) { setLoadError(e.response?.data?.error || 'Could not load users.'); throw e; }
  };
  const loadContacts  = async () => { const { data } = await adminApi.getContacts(); setContacts(data.messages || []); setLastUpdated(new Date()); };
  const loadBilling   = async () => { const { data } = await adminApi.getBilling(); setBilling(data.billing || []); setLastUpdated(new Date()); };
  const loadAuditLog  = async () => { const { data } = await adminApi.getAuditLog(); setAuditLog(data.log || []); setLastUpdated(new Date()); };
  const loadSecEvents = async () => { const { data } = await adminApi.getSecurityEvents(); setSecEvents(data.events || []); setLastUpdated(new Date()); };
  const loadSettings  = async () => { const { data } = await adminApi.getSiteSettings(); setSettings(data.settings || []); setLastUpdated(new Date()); };
  const loadPaymentMethods = async () => { try { const { data } = await adminApi.getPaymentMethods(); setPaymentMethods(data.methods || []); } catch (e:any) { showMsg(e.response?.data?.error || 'Could not load payment methods.', 'err'); } };
  const doCreatePaymentMethod = async () => {
    try {
      await adminApi.createPaymentMethod({ provider_key: newProvider, display_name: newMethodName, description: newMethodDescription });
      showMsg('Payment method added in disabled state. Configure server-side credentials and complete adapter testing before enabling it.');
      loadPaymentMethods();
    } catch (e:any) { showMsg(e.response?.data?.error || 'Could not add payment method.', 'err'); }
  };
  const doTogglePaymentMethod = async (method:any) => {
    try {
      await adminApi.updatePaymentMethod(method.id, { enabled: !method.enabled });
      showMsg(!method.enabled ? 'Payment method published to the website.' : 'Payment method hidden from the website.');
      loadPaymentMethods();
    } catch (e:any) { showMsg(e.response?.data?.error || 'Cannot change payment method state.', 'err'); }
  };
  const doDeletePaymentMethod = async (method:any) => {
    if (!confirm('Remove ' + method.display_name + ' from payment methods?')) return;
    try { await adminApi.deletePaymentMethod(method.id); showMsg('Payment method removed.'); loadPaymentMethods(); }
    catch (e:any) { showMsg(e.response?.data?.error || 'Could not remove payment method.', 'err'); }
  };
  const loadBlockedIPs= async () => { const { data } = await adminApi.getBlockedIPs(); setBlockedIPs(data.blockedIPs || []); setLastUpdated(new Date()); };

  const loadUserDetail = async (u: any) => {
    setSelectedUser(u);
    try { const { data } = await adminApi.getUser(u.id); setUserDetail(data); } catch {}
  };

  const doUpdatePlan = async () => {
    if (!selectedUser || !newPlan) return;
    try {
      const { data } = await adminApi.updatePlan(selectedUser.id, { plan: newPlan, subscription_status: newPlan === 'free' ? 'free' : newPlan === 'trial' ? 'trial' : 'active', ...(newPlan === 'trial' ? { trial_days: Number(trialDays) } : {}) });
      showMsg(data.message || `Plan updated to ${newPlan}`);
      setNewPlan('');
      loadUsers();
      const updatedUser = data.user ? { ...selectedUser, ...data.user } : selectedUser;
      loadUserDetail(updatedUser);
    } catch (e: any) { showMsg(e.response?.data?.error || 'Failed', 'err'); }
  };

  const doBan = async (ban: boolean) => {
    if (!selectedUser) return;
    if (ban && !banReason) { showMsg('Enter a ban reason first', 'err'); return; }
    try {
      await adminApi.toggleBan(selectedUser.id, { ban, reason: banReason });
      showMsg(ban ? 'User banned' : 'User unbanned');
      setBanReason(''); loadUsers(); loadUserDetail(selectedUser);
    } catch (e: any) { showMsg(e.response?.data?.error || 'Failed', 'err'); }
  };

  const doManageBilling = async () => {
    if (!selectedUser) return;
    try {
      const { data } = await adminApi.createUserBillingPortal(selectedUser.id);
      if (!data.url || !(data.url.startsWith('https://billing.stripe.com/') || /^https:\/\/[a-z0-9.-]+\.lemonsqueezy\.com\//i.test(data.url))) {
        showMsg('Payment provider returned an invalid billing portal URL.', 'err');
        return;
      }
      window.location.assign(data.url);
    } catch (e: any) {
      showMsg(e.response?.data?.error || 'Could not open payment provider billing management.', 'err');
    }
  };

  const doVerifyEmail = async () => {
    if (!selectedUser) return;
    try { await adminApi.verifyEmail(selectedUser.id); showMsg('Email verified'); loadUserDetail(selectedUser); }
    catch (e: any) { showMsg(e.response?.data?.error || 'Failed', 'err'); }
  };

  const doDelete = async () => {
    if (!selectedUser) return;
    if (!confirm(`PERMANENTLY DELETE ${selectedUser.email}? This cannot be undone.`)) return;
    try {
      await adminApi.deleteUser(selectedUser.id);
      showMsg('User deleted');
      setSelectedUser(null); setUserDetail(null); loadUsers();
    } catch (e: any) { showMsg(e.response?.data?.error || 'Failed', 'err'); }
  };

  const doUpdateSetting = async (key: string) => {
    try {
      await adminApi.updateSetting(key, { value: settingEdits[key] });
      showMsg(`"${key}" updated`);
      loadSettings();
    } catch (e: any) { showMsg(e.response?.data?.error || 'Failed', 'err'); }
  };

  const doBlockIP = async () => {
    if (!newIP) return;
    try {
      await adminApi.blockIP({ ipAddress: newIP, reason: newIPReason });
      showMsg(`IP ${newIP} blocked`);
      setNewIP(''); setNewIPReason(''); loadBlockedIPs();
    } catch (e: any) { showMsg(e.response?.data?.error || 'Failed', 'err'); }
  };

  const doUnblockIP = async (ip: string) => {
    try { await adminApi.unblockIP(ip); showMsg(`IP ${ip} unblocked`); loadBlockedIPs(); }
    catch (e: any) { showMsg('Failed', 'err'); }
  };

  const doMarkContact = async (id: string, status: string) => {
    await adminApi.updateContact(id, { status }); loadContacts();
  };

  const TABS = [
    { id:'overview',  l:'Overview',  i:'📊' },
    { id:'users',     l:'Users',     i:'👥' },
    { id:'settings',  l:'Settings',  i:'⚙️' },
    { id:'security',  l:'Security',  i:'🛡️' },
    { id:'contacts',  l:'Messages',  i:'💬' },
    { id:'billing',   l:'Billing',   i:'💰' },
    { id:'payment-methods', l:'Payment Methods', i:'💳' },
    { id:'log',       l:'Audit Log', i:'📋' },
  ] as const;

  if (loading) return <div style={{ color:'rgba(255,255,255,0.3)', padding:40 }}>Loading...</div>;
  if (!isAdmin) return null;

  const isSuperAdmin = isAdmin;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div style={{ display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,#f59e0b,#ef4444)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>⚡</div>
          <div>
            <h1 style={{ fontSize:22,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Admin Panel</h1>
            <p style={{ fontSize:12,color:'rgba(255,255,255,0.35)' }}>{user?.email} · {user?.role}</p>
          </div>
        </div>
        <Link href="/dashboard/admin/support" style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 18px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:10,color:'#818cf8',textDecoration:'none',fontSize:13,fontWeight:600 }}>
          🛟 Support Panel →
        </Link>
        <Link href="/dashboard/admin/commerce" style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 18px',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:10,color:'#fbbf24',textDecoration:'none',fontSize:13,fontWeight:600 }}>
          💳 Commerce →
        </Link>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:12,marginBottom:16}}><span style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Live data'}</span><button onClick={refreshCurrentTab} disabled={refreshing} className="btn-primary" style={{fontSize:12,padding:'7px 14px',opacity:refreshing?0.6:1}}>{refreshing?'Refreshing…':'↻ Refresh'}</button></div>
      {loadError && <div role="alert" style={{marginBottom:14,padding:12,border:'1px solid rgba(239,68,68,.3)',borderRadius:9,color:'#fca5a5',fontSize:12}}>{loadError}</div>}
      {msg && (
        <div style={{ marginBottom:18,padding:'12px 16px',background:msgType==='err'?'rgba(239,68,68,0.08)':'rgba(74,222,128,0.08)',border:`1px solid ${msgType==='err'?'rgba(239,68,68,0.25)':'rgba(74,222,128,0.25)'}`,borderRadius:10,fontSize:13,color:msgType==='err'?'#fca5a5':'#4ade80',display:'flex',justifyContent:'space-between' }}>
          <span>{msg}</span><button onClick={() => setMsg('')} style={{ background:'none',border:'none',color:'inherit',cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex',gap:4,background:'rgba(255,255,255,0.04)',padding:4,borderRadius:12,marginBottom:24,flexWrap:'wrap',width:'fit-content' }}>
        {TABS.filter(t => (t.id !== 'settings' && t.id !== 'payment-methods') || isAdmin).map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'none',background:tab===t.id?'rgba(255,255,255,0.1)':'transparent',color:tab===t.id?'#fff':'rgba(255,255,255,0.45)',fontSize:13,fontWeight:tab===t.id?600:400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s' }}>
            {t.i} {t.l}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && stats && (
        <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14 }}>
            <StatCard icon="👥" label="Total users"      value={stats.totalUsers?.toLocaleString()}    color="#6366f1" />
            <StatCard icon="💳" label="Active subs"      value={stats.activeSubs}                      color="#8b5cf6" sub={`${stats.trialUsers} on trial`} />
            <StatCard icon="💰" label="Total revenue"    value={`$${stats.totalRevenue}`}              color="#4ade80" />
            <StatCard icon="🌐" label="Websites"         value={stats.totalWebsites}                   color="#ec4899" />
            <StatCard icon="🔍" label="Audits run"       value={stats.totalAudits}                     color="#60a5fa" />
            <StatCard icon="🆕" label="New today"        value={stats.newUsersToday}                   color="#fbbf24" sub={`${stats.newUsersThisWeek} this week`} />
            <StatCard icon="💬" label="Unread messages"  value={stats.unreadContacts}                  color="#f59e0b" />
          </div>

          {/* Plan breakdown */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20 }}>
            <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22 }}>
              <h3 style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Users by plan</h3>
              {Object.entries(stats.planCounts || {}).map(([plan, count]: any) => {
                const total = stats.totalUsers || 1;
                const pct = Math.round((count/total)*100);
                const colors: any = { free:'#6b7280',trial:'#f59e0b',starter:'#6366f1',growth:'#8b5cf6',pro:'#ec4899',agency:'#f59e0b' };
                return (
                  <div key={plan} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:5 }}>
                      <span style={{ fontSize:13,color:'rgba(255,255,255,0.65)',textTransform:'capitalize' }}>{plan}</span>
                      <span style={{ fontSize:13,fontWeight:700,color:colors[plan] }}>{count}</span>
                    </div>
                    <div style={{ height:5,background:'rgba(255,255,255,0.06)',borderRadius:100 }}>
                      <div style={{ height:'100%',width:`${pct}%`,background:colors[plan]||'#6366f1',borderRadius:100,transition:'width 0.6s ease' }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22 }}>
              <h3 style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Recent security events (24h)</h3>
              {stats.recentSecurityEvents?.length > 0 ? stats.recentSecurityEvents.map((e: any) => (
                <div key={e.event} style={{ display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,0.6)',fontFamily:'monospace' }}>{e.event}</span>
                  <span style={{ fontSize:12,fontWeight:700,color:e.count>10?'#f87171':'rgba(255,255,255,0.5)' }}>{e.count}</span>
                </div>
              )) : <p style={{ fontSize:13,color:'rgba(255,255,255,0.3)' }}>No security events today.</p>}
            </div>
          </div>
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <div style={{ display:'grid',gridTemplateColumns:selectedUser?'1fr 380px':'1fr',gap:20,alignItems:'start' }}>
          <div>
            {/* Filters */}
            <div style={{ display:'flex',gap:8,marginBottom:16,flexWrap:'wrap' }}>
              <input className="input-dark" placeholder="Search email or name..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter'&&loadUsers()} style={{ flex:1,minWidth:180,fontSize:13,padding:'8px 14px' }}/>
              <select className="input-dark" value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={{ fontSize:13,padding:'8px 12px',width:'auto' }}>
                <option value="">All plans</option>
                {['free','trial','starter','growth','pro','agency'].map(p => <option key={p}>{p}</option>)}
              </select>
              <select className="input-dark" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ fontSize:13,padding:'8px 12px',width:'auto' }}>
                <option value="">All statuses</option>
                {['free','trial','active','past_due','cancelled'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="input-dark" value={bannedFilter} onChange={e => setBannedFilter(e.target.value)} style={{ fontSize:13,padding:'8px 12px',width:'auto' }}>
                <option value="">All users</option>
                <option value="true">Banned</option>
                <option value="false">Not banned</option>
              </select>
              <button onClick={loadUsers} className="btn-primary" style={{ fontSize:13,padding:'8px 18px',whiteSpace:'nowrap' }}>Search</button>
            </div>
            <p style={{ fontSize:12,color:'rgba(255,255,255,0.3)',marginBottom:12 }}>{userTotal.toLocaleString()} users found</p>

            {/* Table */}
            <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                <thead>
                  <tr style={{ background:'rgba(255,255,255,0.04)' }}>
                    {['Name / Email','Plan','Status','Role','Joined','Action'].map(h => (
                      <th key={h} style={{ textAlign:'left',padding:'11px 14px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} style={{ borderTop:'1px solid rgba(255,255,255,0.04)',background:u.is_banned?'rgba(239,68,68,0.03)':i%2===0?'rgba(255,255,255,0.01)':'transparent',transition:'background 0.15s',cursor:'pointer' }}
                      onClick={() => loadUserDetail(u)}>
                      <td style={{ padding:'11px 14px' }}>
                        <p style={{ fontWeight:600,color:u.is_banned?'#f87171':'rgba(255,255,255,0.85)' }}>{u.name}</p>
                        <p style={{ fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2 }}>{u.email}</p>
                        {!u.email_verified && <span style={{ fontSize:10,color:'#fbbf24',fontWeight:600 }}>⚠ Unverified</span>}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:100,background:'rgba(99,102,241,0.12)',color:'#818cf8',textTransform:'capitalize' }}>{u.plan}</span>
                      </td>
                      <td style={{ padding:'11px 14px',fontSize:11,fontWeight:600,color:u.subscription_status==='active'?'#4ade80':u.subscription_status==='trial'?'#fbbf24':'rgba(255,255,255,0.4)',textTransform:'capitalize' }}>{u.subscription_status}</td>
                      <td style={{ padding:'11px 14px',fontSize:11,color:u.role!=='user'?'#f59e0b':'rgba(255,255,255,0.35)',fontWeight:u.role!=='user'?700:400,textTransform:'capitalize' }}>{u.role}</td>
                      <td style={{ padding:'11px 14px',fontSize:11,color:'rgba(255,255,255,0.3)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span style={{ fontSize:12,color:'#818cf8',fontWeight:500 }}>Manage →</span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} style={{ padding:'40px',textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:13 }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* User detail panel */}
          {selectedUser && (
            <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:22,position:'sticky',top:20 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:18 }}>
                <h3 style={{ fontSize:15,fontWeight:700 }}>Manage User</h3>
                <button onClick={() => { setSelectedUser(null); setUserDetail(null); }} style={{ background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:18 }}>✕</button>
              </div>

              {/* User info */}
              <div style={{ background:'rgba(255,255,255,0.03)',borderRadius:10,padding:14,marginBottom:18 }}>
                <p style={{ fontWeight:700,marginBottom:4 }}>{selectedUser.name}</p>
                <p style={{ fontSize:13,color:'rgba(255,255,255,0.45)',marginBottom:2 }}>{selectedUser.email}</p>
                <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginTop:6 }}>
                  <span style={{ fontSize:11,padding:'2px 8px',background:'rgba(99,102,241,0.12)',borderRadius:100,color:'#818cf8',textTransform:'capitalize' }}>{selectedUser.plan}</span>
                  <span style={{ fontSize:11,color:selectedUser.email_verified?'#4ade80':'#fbbf24',fontWeight:600 }}>{selectedUser.email_verified?'✓ Verified':'⚠ Unverified'}</span>
                  {selectedUser.is_banned && <span style={{ fontSize:11,color:'#f87171',fontWeight:700 }}>🔴 BANNED</span>}
                </div>
                <p style={{ fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:6 }}>Joined: {new Date(selectedUser.created_at).toLocaleString()}</p>
                {userDetail?.user?.last_login && <p style={{ fontSize:11,color:'rgba(255,255,255,0.25)' }}>Last login: {new Date(userDetail.user.last_login).toLocaleString()}</p>}
                {userDetail?.user?.website_count !== undefined && <p style={{ fontSize:11,color:'rgba(255,255,255,0.25)' }}>{userDetail.user.website_count} websites · {userDetail.user.audit_count} audits</p>}
              </div>

              {/* Change plan */}
              <div style={{ marginBottom:16 }}>
                <p style={{ fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Change plan</p>
                <div style={{ display:'flex',gap:8 }}>
                  <select className="input-dark" value={newPlan} onChange={e => setNewPlan(e.target.value)} style={{ flex:1,fontSize:12,padding:'8px 12px' }}>
                    <option value="">Select plan...</option>
                    {['free','trial','starter','growth','pro','agency'].map(p => <option key={p}>{p}</option>)}
                  </select>
                  <button onClick={doUpdatePlan} disabled={!newPlan || !!selectedUser.has_stripe_subscription || !!selectedUser.has_provider_subscription} style={{ padding:'8px 14px',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,color:'#818cf8',cursor:'pointer',fontSize:12,fontFamily:'inherit',opacity:newPlan?1:0.4 }}>Apply</button>
                </div>
                {newPlan === 'trial' && (
                  <label style={{ display:'block',fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:10 }}>
                    Trial duration (1–90 days)
                    <input className="input-dark" type="number" min={1} max={90} step={1} value={trialDays} onChange={e => setTrialDays(e.target.value)} style={{ display:'block',width:'100%',marginTop:5,padding:'8px 12px',fontSize:12 }} />
                  </label>
                )}
                {selectedUser.trial_ends_at && selectedUser.plan === 'trial' && (
                  <p style={{ fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:8 }}>Trial ends: {new Date(selectedUser.trial_ends_at).toLocaleString()}</p>
                )}
                {(selectedUser.has_stripe_subscription || selectedUser.has_provider_subscription) && <p style={{ fontSize:11,color:'#fbbf24',marginTop:8 }}>The payment provider manages this subscription. Use the billing portal above to change the plan, update payment details, or cancel; direct database overrides are disabled.</p>}
              </div>

              {/* Quick actions */}
              <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:16 }}>
                {(selectedUser.has_stripe_customer || selectedUser.has_provider_subscription) && <button onClick={doManageBilling} style={{ padding:'9px',background:'rgba(99,102,241,0.10)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:9,color:'#a5b4fc',cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:600 }}>Manage provider billing & payment methods →</button>}
                {!selectedUser.email_verified && (
                  <button onClick={doVerifyEmail} style={{ padding:'9px',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:9,color:'#4ade80',cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:600 }}>
                    ✓ Force verify email
                  </button>
                )}
              </div>

              {/* Ban */}
              <div style={{ marginBottom:16 }}>
                <p style={{ fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.38)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 }}>Ban / unban</p>
                <input className="input-dark" placeholder="Ban reason (required to ban)..." value={banReason} onChange={e => setBanReason(e.target.value)} style={{ marginBottom:8,fontSize:12,padding:'8px 12px' }}/>
                <div style={{ display:'flex',gap:8 }}>
                  <button onClick={() => doBan(true)} disabled={!banReason} style={{ flex:1,padding:'8px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,color:'#f87171',cursor:'pointer',fontSize:12,fontFamily:'inherit',opacity:banReason?1:0.4 }}>Ban</button>
                  <button onClick={() => doBan(false)} style={{ flex:1,padding:'8px',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:8,color:'#4ade80',cursor:'pointer',fontSize:12,fontFamily:'inherit' }}>Unban</button>
                </div>
              </div>

              {/* Superadmin only actions */}
              {isSuperAdmin && (
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:16,marginTop:8 }}>
                  <p style={{ fontSize:11,fontWeight:700,color:'rgba(245,158,11,0.7)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10 }}>Superadmin actions</p>
                  <button onClick={doDelete} style={{ width:'100%',padding:'9px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:9,color:'#f87171',cursor:'pointer',fontSize:12,fontFamily:'inherit',fontWeight:600 }}>
                    🗑 Delete user permanently
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PAYMENT METHODS (superadmin only) */}
      {tab === 'payment-methods' && (
        isSuperAdmin ? (
          <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
            <div style={{ background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:12,padding:'14px 16px' }}>
              <p style={{ fontSize:13,color:'#fbbf24',fontWeight:700,marginBottom:5 }}>Provider-independent payment controls</p>
              <p style={{ fontSize:12,color:'rgba(255,255,255,0.55)',lineHeight:1.7 }}>The public website reads enabled methods from the backend. New methods start disabled. Secret keys belong only in Render environment variables. A provider cannot be published until credentials are present and its checkout + signed-webhook adapter is marked ready after sandbox tests. This repository currently does not mark either provider adapter as ready.</p>
            </div>
            <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:20 }}>
              <h3 style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>Add payment provider</h3>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10 }}>
                <select className="input-dark" value={newProvider} onChange={e => { setNewProvider(e.target.value); const presets:any={safepay:['Safepay','Pakistan-focused payments'],lemon_squeezy:['Lemon Squeezy','International SaaS subscriptions'],manual_bank_transfer:['Manual bank transfer','Manual verification required']}; setNewMethodName(presets[e.target.value][0]); setNewMethodDescription(presets[e.target.value][1]); }} style={{ fontSize:13,padding:'9px 12px' }}>
                  <option value="safepay">Safepay</option><option value="lemon_squeezy">Lemon Squeezy</option><option value="manual_bank_transfer">Manual bank transfer</option>
                </select>
                <input className="input-dark" value={newMethodName} onChange={e => setNewMethodName(e.target.value)} maxLength={80} placeholder="Public display name" style={{ fontSize:13,padding:'9px 12px' }} />
                <input className="input-dark" value={newMethodDescription} onChange={e => setNewMethodDescription(e.target.value)} maxLength={240} placeholder="Public description" style={{ fontSize:13,padding:'9px 12px' }} />
                <button onClick={doCreatePaymentMethod} className="btn-primary" style={{ fontSize:13,padding:'9px 16px' }}>Add disabled method</button>
              </div>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
              {paymentMethods.map(method => (
                <div key={method.id} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:13,padding:18 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap' }}>
                    <div style={{ flex:1,minWidth:200 }}>
                      <p style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>{method.display_name}</p>
                      <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8 }}>{method.description || method.provider_key}</p>
                      <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                        <span style={{ fontSize:10,padding:'3px 8px',borderRadius:100,background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.55)' }}>{method.provider_key}</span>
                        <span style={{ fontSize:10,padding:'3px 8px',borderRadius:100,background:method.configured?'rgba(74,222,128,0.1)':'rgba(245,158,11,0.1)',color:method.configured?'#4ade80':'#fbbf24' }}>{method.configured?'Credentials detected':'Credentials missing'}</span>
                        <span style={{ fontSize:10,padding:'3px 8px',borderRadius:100,background:method.adapterReady?'rgba(74,222,128,0.1)':'rgba(239,68,68,0.1)',color:method.adapterReady?'#4ade80':'#fca5a5' }}>{method.adapterReady?'Adapter ready':'Checkout/webhook tests pending'}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                      <button onClick={() => doTogglePaymentMethod(method)} disabled={!method.enabled && (!method.configured || !method.adapterReady)} style={{ padding:'8px 12px',background:method.enabled?'rgba(74,222,128,0.08)':'rgba(99,102,241,0.1)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:method.enabled?'#4ade80':'#a5b4fc',cursor:(!method.enabled && (!method.configured || !method.adapterReady))?'not-allowed':'pointer',opacity:(!method.enabled && (!method.configured || !method.adapterReady))?0.45:1,fontSize:12,fontFamily:'inherit' }}>{method.enabled?'Disable':'Enable on website'}</button>
                      <button onClick={() => doDeletePaymentMethod(method)} style={{ padding:'8px 12px',background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.18)',borderRadius:8,color:'#fca5a5',cursor:'pointer',fontSize:12,fontFamily:'inherit' }}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
              {!paymentMethods.length && <p style={{ textAlign:'center',padding:36,color:'rgba(255,255,255,0.35)',fontSize:13 }}>No payment methods configured. Add Safepay or Lemon Squeezy above.</p>}
            </div>
          </div>
        ) : <div style={{ padding:40,textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:14 }}>Superadmin access required to manage payment methods.</div>
      )}

      {/* SETTINGS (superadmin only) */}
      {tab === 'settings' && (
        isSuperAdmin ? (
          <div style={{ maxWidth:640 }}>
            <div style={{ background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:12,padding:'12px 16px',marginBottom:24 }}>
              <p style={{ fontSize:13,color:'#fbbf24',fontWeight:600 }}>⚠️ Superadmin only — changes take effect immediately for all users.</p>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
              {settings.map(s => (
                <div key={s.key} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:18 }}>
                  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,flexWrap:'wrap' }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700,fontSize:13,color:'#fff',marginBottom:4,fontFamily:'monospace' }}>{s.key}</p>
                      <p style={{ fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8 }}>{s.description}</p>
                      <div style={{ display:'flex',gap:8 }}>
                        <input className="input-dark" value={settingEdits[s.key] ?? s.value} onChange={e => setSettingEdits(p => ({...p,[s.key]:e.target.value}))} style={{ fontSize:13,padding:'7px 12px',flex:1 }}/>
                        <button onClick={() => doUpdateSetting(s.key)} style={{ padding:'7px 16px',background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,color:'#818cf8',cursor:'pointer',fontSize:12,fontFamily:'inherit',whiteSpace:'nowrap' }}>Save</button>
                      </div>
                    </div>
                    <div style={{ textAlign:'right',flexShrink:0 }}>
                      <span style={{ fontSize:11,padding:'3px 10px',background:s.value==='true'?'rgba(74,222,128,0.1)':s.value==='false'?'rgba(239,68,68,0.08)':'rgba(255,255,255,0.05)',borderRadius:100,color:s.value==='true'?'#4ade80':s.value==='false'?'#f87171':'rgba(255,255,255,0.5)',fontWeight:600 }}>
                        {s.value || '(empty)'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : <div style={{ padding:40,textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:14 }}>Superadmin access required to manage site settings.</div>
      )}

      {/* SECURITY */}
      {tab === 'security' && (
        <div style={{ display:'flex',flexDirection:'column',gap:20 }}>
          {isSuperAdmin && (
            <>
              {/* Block IP */}
              <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22 }}>
                <h3 style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>🚫 Block IP Address</h3>
                <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
                  <input className="input-dark" placeholder="IP address (e.g. 1.2.3.4)" value={newIP} onChange={e => setNewIP(e.target.value)} style={{ flex:1,minWidth:180,fontSize:13,padding:'8px 12px' }}/>
                  <input className="input-dark" placeholder="Reason (optional)" value={newIPReason} onChange={e => setNewIPReason(e.target.value)} style={{ flex:1,minWidth:180,fontSize:13,padding:'8px 12px' }}/>
                  <button onClick={doBlockIP} disabled={!newIP} className="btn-primary" style={{ fontSize:13,padding:'8px 18px' }}>Block IP</button>
                </div>
              </div>

              {/* Blocked IPs */}
              {blockedIPs.length > 0 && (
                <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22 }}>
                  <h3 style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Blocked IPs ({blockedIPs.length})</h3>
                  {blockedIPs.map(ip => (
                    <div key={ip.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',gap:12 }}>
                      <div>
                        <p style={{ fontSize:13,fontWeight:600,color:'#f87171',fontFamily:'monospace' }}>{ip.ip_address}</p>
                        <p style={{ fontSize:11,color:'rgba(255,255,255,0.35)' }}>{ip.reason} · {new Date(ip.created_at).toLocaleDateString()}{ip.expires_at?` · expires ${new Date(ip.expires_at).toLocaleDateString()}`:' · permanent'}</p>
                      </div>
                      <button onClick={() => doUnblockIP(ip.ip_address)} style={{ padding:'5px 12px',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:7,color:'#4ade80',cursor:'pointer',fontSize:12,fontFamily:'inherit' }}>Unblock</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Security events */}
          <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22 }}>
            <h3 style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Security Events (last 100)</h3>
            <div style={{ display:'flex',flexDirection:'column',gap:8,maxHeight:480,overflowY:'auto' }}>
              {secEvents.map(e => (
                <div key={e.id} style={{ display:'flex',gap:14,alignItems:'flex-start',padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize:11,color:'rgba(255,255,255,0.28)',whiteSpace:'nowrap',paddingTop:1 }}>{new Date(e.created_at).toLocaleString()}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <span style={{ fontSize:12,fontWeight:600,color:e.event.includes('block')||e.event.includes('ban')||e.event.includes('fail')?'#f87171':e.event.includes('login')?'#818cf8':'rgba(255,255,255,0.65)',fontFamily:'monospace' }}>{e.event}</span>
                    {e.email && <span style={{ fontSize:11,color:'rgba(255,255,255,0.35)',marginLeft:8 }}>{e.email}</span>}
                    {e.ip_address && <span style={{ fontSize:11,color:'rgba(255,255,255,0.25)',marginLeft:8 }}>{e.ip_address}</span>}
                  </div>
                </div>
              ))}
              {secEvents.length === 0 && <p style={{ color:'rgba(255,255,255,0.3)',fontSize:13,textAlign:'center',padding:'20px 0' }}>No security events found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* CONTACTS */}
      {tab === 'contacts' && (
        <div style={{ display:'flex',flexDirection:'column',gap:12 }}>
          {contacts.map(c => (
            <div key={c.id} style={{ background:'rgba(255,255,255,0.02)',border:`1px solid ${c.status==='unread'?'rgba(99,102,241,0.25)':'rgba(255,255,255,0.07)'}`,borderRadius:13,padding:20 }}>
              <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8 }}>
                <div>
                  <span style={{ fontWeight:700,fontSize:14 }}>{c.name}</span>
                  <a href={`mailto:${c.email}`} style={{ color:'rgba(255,255,255,0.4)',fontSize:13,marginLeft:10,textDecoration:'none' }}>{c.email}</a>
                  {c.company && <span style={{ color:'rgba(255,255,255,0.3)',fontSize:12,marginLeft:8 }}>· {c.company}</span>}
                </div>
                <div style={{ display:'flex',gap:8,alignItems:'center' }}>
                  <span style={{ fontSize:11,padding:'2px 10px',borderRadius:100,fontWeight:600,background:c.status==='unread'?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.05)',color:c.status==='unread'?'#818cf8':'rgba(255,255,255,0.35)' }}>{c.status}</span>
                  <span style={{ fontSize:11,color:'rgba(255,255,255,0.28)' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <p style={{ fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.65,marginBottom:12 }}>{c.message}</p>
              <div style={{ display:'flex',gap:8 }}>
                {c.status!=='replied'&&<button onClick={() => doMarkContact(c.id,'replied')} style={{ fontSize:12,padding:'5px 14px',background:'rgba(74,222,128,0.08)',border:'1px solid rgba(74,222,128,0.2)',borderRadius:7,color:'#4ade80',cursor:'pointer',fontFamily:'inherit' }}>Mark replied</button>}
                {c.status==='unread'&&<button onClick={() => doMarkContact(c.id,'read')} style={{ fontSize:12,padding:'5px 14px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:7,color:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit' }}>Mark read</button>}
                <a href={`mailto:${c.email}?subject=Re: ${c.subject||'Your enquiry'}`} style={{ fontSize:12,padding:'5px 14px',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:7,color:'#818cf8',textDecoration:'none' }}>Reply →</a>
              </div>
            </div>
          ))}
          {contacts.length===0&&<p style={{ textAlign:'center',color:'rgba(255,255,255,0.3)',padding:40,fontSize:13 }}>No messages.</p>}
        </div>
      )}

      {/* BILLING */}
      {tab === 'billing' && (
        <div style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden' }}>
          <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
            <thead>
              <tr style={{ background:'rgba(255,255,255,0.04)' }}>
                {['User','Plan','Amount','Status','Date'].map(h=>(
                  <th key={h} style={{ textAlign:'left',padding:'11px 16px',color:'rgba(255,255,255,0.35)',fontWeight:500,fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {billing.map((b,i)=>(
                <tr key={b.id} style={{ borderTop:'1px solid rgba(255,255,255,0.04)',background:i%2===0?'rgba(255,255,255,0.01)':'transparent' }}>
                  <td style={{ padding:'11px 16px' }}><p style={{ fontWeight:500,color:'rgba(255,255,255,0.8)' }}>{b.user_name}</p><p style={{ fontSize:11,color:'rgba(255,255,255,0.35)' }}>{b.user_email}</p></td>
                  <td style={{ padding:'11px 16px',textTransform:'capitalize',color:'#818cf8',fontWeight:600 }}>{b.plan}</td>
                  <td style={{ padding:'11px 16px',fontWeight:700,color:'#4ade80' }}>${b.amount}</td>
                  <td style={{ padding:'11px 16px',color:b.status==='paid'?'#4ade80':'#f87171',fontWeight:600 }}>{b.status}</td>
                  <td style={{ padding:'11px 16px',color:'rgba(255,255,255,0.35)',fontSize:12 }}>{new Date(b.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {billing.length===0&&<tr><td colSpan={5} style={{ padding:'40px',textAlign:'center',color:'rgba(255,255,255,0.3)' }}>No billing records.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* AUDIT LOG */}
      {tab === 'log' && (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {auditLog.map(e=>(
            <div key={e.id} style={{ background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,padding:'12px 16px',display:'flex',gap:14,alignItems:'flex-start' }}>
              <span style={{ fontSize:11,color:'rgba(255,255,255,0.28)',whiteSpace:'nowrap',paddingTop:2 }}>{new Date(e.created_at).toLocaleString()}</span>
              <div>
                <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                  <span style={{ fontSize:13,fontWeight:600,color:'#818cf8' }}>{e.admin_name||'Admin'}</span>
                  <span style={{ fontSize:12,color:'rgba(255,255,255,0.3)' }}>→</span>
                  <span style={{ fontSize:13,fontWeight:600,color:'#fff',fontFamily:'monospace' }}>{e.action.replace(/_/g,' ')}</span>
                  {e.target_name&&<span style={{ fontSize:12,color:'rgba(255,255,255,0.4)' }}>on {e.target_name} ({e.target_email})</span>}
                </div>
                {e.details && Object.keys(JSON.parse(typeof e.details==='string'?e.details:'"{}"')||{}).length>0&&(
                  <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:3,fontFamily:'monospace' }}>{typeof e.details==='string'?e.details:JSON.stringify(e.details)}</p>
                )}
              </div>
            </div>
          ))}
          {auditLog.length===0&&<p style={{ textAlign:'center',color:'rgba(255,255,255,0.3)',padding:40,fontSize:13 }}>No admin actions logged yet.</p>}
        </div>
      )}
    </div>
  );
}

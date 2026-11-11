'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const GROUPS = [
  { title: 'COMMAND', items: [
    { href: '/admin#overview', icon: '◫', label: 'Overview' },
    { href: '/admin/commerce', icon: '▤', label: 'Commerce & Orders' },
  ]},
  { title: 'CUSTOMERS', items: [
    { href: '/admin#users', icon: '♙', label: 'Users & Accounts' },
    { href: '/admin#contacts', icon: '✉', label: 'Messages' },
    { href: '/admin/support', icon: '◎', label: 'Customer Support' },
  ]},
  { title: 'CONFIGURATION', items: [
    { href: '/admin#plans', icon: '◇', label: 'Plans & Entitlements' },
    { href: '/admin#payment-methods', icon: '▣', label: 'Payment Methods' },
    { href: '/admin#settings', icon: '⚙', label: 'Website Content' },
  ]},
  { title: 'TRUST & GOVERNANCE', items: [
    { href: '/admin#security', icon: '⬡', label: 'Security Centre' },
    { href: '/admin#billing', icon: '＄', label: 'Billing Records' },
    { href: '/admin#log', icon: '≋', label: 'Audit Trail' },
  ]},
];

export default function OwnerAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, loading, logout } = useAuth();
  const [activeHash, setActiveHash] = useState('overview');
  const publicAdminRoute = pathname === '/admin/login' || pathname === '/admin/setup';

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash.replace(/^#/, '') || 'overview');
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    if (!publicAdminRoute && !loading && !isAdmin) router.replace('/admin/login');
  }, [publicAdminRoute, loading, isAdmin, router]);

  if (publicAdminRoute) return <>{children}</>;
  if (loading || !isAdmin) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#080b13',color:'#a1a1aa'}}>Verifying secure owner session…</main>;

  const activeLabel = GROUPS.flatMap(g => g.items).find(item =>
    item.href.startsWith('/admin#') ? pathname === '/admin' && activeHash === item.href.split('#')[1] : pathname.startsWith(item.href)
  )?.label || 'Owner workspace';

  return (
    <div className="rp-admin-shell">
      <style>{`
.rp-admin-shell{--admin-line:rgba(148,163,184,.13);min-height:100vh;display:flex;background:radial-gradient(ellipse at 78% -10%,rgba(59,91,145,.17),transparent 38%),#080d18;color:#f4f7fc;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.rp-admin-sidebar{width:276px;flex:0 0 276px;display:flex;flex-direction:column;background:rgba(10,17,29,.96);border-right:1px solid var(--admin-line);min-height:100vh;position:sticky;top:0;height:100vh;z-index:20;backdrop-filter:blur(16px)}
.rp-admin-brand{padding:23px 20px 21px;border-bottom:1px solid var(--admin-line)}
.rp-admin-nav{padding:18px 12px;display:grid;gap:19px;flex:1;align-content:start;overflow:auto}
.rp-admin-group-title{font-size:9px;letter-spacing:.18em;color:#65758e;font-weight:850;padding:0 11px 8px}
.rp-admin-link{display:flex;align-items:center;gap:12px;padding:10px 11px;border-radius:11px;text-decoration:none;font-size:12px;font-weight:650;color:#91a0b6;border:1px solid transparent;min-height:42px;transition:all .16s}
.rp-admin-link:hover{background:rgba(148,163,184,.09);color:#f0f4fa;border-color:rgba(148,163,184,.08)}
.rp-admin-link:focus-visible{outline:2px solid #fbbf24;outline-offset:2px}
.rp-admin-link.active{background:linear-gradient(100deg,rgba(245,158,11,.18),rgba(245,158,11,.055));border-color:rgba(245,158,11,.28);color:#ffda91;box-shadow:inset 3px 0 #fbbf24,0 5px 18px rgba(0,0,0,.12)}
.rp-admin-link-icon{width:21px;flex:0 0 21px;text-align:center;font-size:16px}
.rp-admin-main{flex:1;min-width:0;padding:0 34px 44px}
.rp-admin-topbar{min-height:82px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--admin-line);margin-bottom:30px;gap:16px}
.rp-admin-top-actions{display:flex;align-items:center;gap:10px}
.rp-admin-top-link{padding:9px 13px;border:1px solid #2b394d;border-radius:10px;color:#c2ccda;text-decoration:none;font-size:10px;font-weight:750;white-space:nowrap;background:rgba(255,255,255,.025);transition:all .15s}
.rp-admin-top-link:hover{background:#182437;color:#fff;border-color:#43546b}
.rp-admin-content{max-width:1680px;margin:0 auto}
@media(max-width:1100px){.rp-admin-sidebar{width:238px;flex-basis:238px}.rp-admin-main{padding-left:22px;padding-right:22px}}
@media(max-width:760px){.rp-admin-shell{display:block}.rp-admin-sidebar{position:relative;width:100%;height:auto;min-height:0;border-right:0;border-bottom:1px solid var(--admin-line)}.rp-admin-brand{padding:14px 16px}.rp-admin-nav{display:flex;gap:8px;padding:10px 12px;overflow-x:auto;align-items:center}.rp-admin-nav-group{display:contents}.rp-admin-group-title{display:none}.rp-admin-link{white-space:nowrap;padding:9px 11px;min-height:38px}.rp-admin-sidebar-footer{display:none}.rp-admin-main{padding:0 15px 30px}.rp-admin-topbar{min-height:68px;margin-bottom:20px;flex-wrap:wrap;padding:12px 0}.rp-admin-top-actions{gap:7px}.rp-admin-top-link{padding:8px 9px;font-size:9px}}
@media(max-width:440px){.rp-admin-main{padding-left:12px;padding-right:12px}.rp-admin-topbar{align-items:flex-start}.rp-admin-top-actions{width:100%;justify-content:space-between}}
      `}</style>
      <aside className="rp-admin-sidebar">
        <div className="rp-admin-brand">
          <Link href="/admin" style={{display:'flex',alignItems:'center',gap:11,textDecoration:'none',color:'#fff'}}>
            <span style={{width:38,height:38,borderRadius:12,display:'grid',placeItems:'center',background:'linear-gradient(145deg,#fbbf24,#f97316 58%,#e34d5b)',boxShadow:'0 7px 22px rgba(249,115,22,.2)',fontSize:19}}>⚡</span>
            <span><strong style={{fontSize:16,letterSpacing:'-.03em'}}>RankPilot <span style={{color:'#fbbf24'}}>Control</span></strong><small style={{display:'block',fontSize:9,color:'#718097',letterSpacing:'.15em',fontWeight:800,marginTop:4}}>OWNER CONSOLE</small></span>
          </Link>
        </div>
        <nav aria-label="Owner administration" className="rp-admin-nav">
          {GROUPS.map(group => <div className="rp-admin-nav-group" key={group.title}>
            <div className="rp-admin-group-title">{group.title}</div>
            <div style={{display:'grid',gap:4}}>
              {group.items.map(item => {
                const active = item.href.startsWith('/admin#') ? pathname === '/admin' && activeHash === item.href.split('#')[1] : pathname.startsWith(item.href);
                return <Link key={item.href} href={item.href} aria-current={active?'page':undefined} className={`rp-admin-link ${active?'active':''}`}>
                  <span className="rp-admin-link-icon">{item.icon}</span><span>{item.label}</span>{active&&<span style={{marginLeft:'auto',fontSize:15}}>›</span>}
                </Link>;
              })}
            </div>
          </div>)}
        </nav>
        <div className="rp-admin-sidebar-footer" style={{padding:'15px 17px',borderTop:'1px solid #202a3a'}}>
          <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:12}}>
            <span style={{width:29,height:29,borderRadius:9,display:'grid',placeItems:'center',background:'#1b2939',color:'#fbbf24',fontWeight:800}}>O</span>
            <span style={{minWidth:0}}><strong style={{display:'block',fontSize:11,overflowWrap:'anywhere'}}>{user?.email||'Owner account'}</strong><small style={{fontSize:9,color:'#6e7e94'}}>MFA-protected owner</small></span>
          </div>
          <button onClick={logout} style={{width:'100%',padding:'9px 11px',borderRadius:8,border:'1px solid #2a3547',background:'#131c29',color:'#aab6c8',cursor:'pointer',fontSize:11,fontWeight:700}}>Sign out securely ↗</button>
        </div>
      </aside>
      <main className="rp-admin-main">
        <header className="rp-admin-topbar">
          <div>
            <div style={{fontSize:9,color:'#728097',letterSpacing:'.16em',fontWeight:800}}>RANKPILOT / OWNER WORKSPACE</div>
            <div style={{fontSize:16,fontWeight:800,marginTop:5}}>{activeLabel}</div>
          </div>
          <div className="rp-admin-top-actions">
            <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:10,color:'#7f91a9',padding:'7px 9px',borderRadius:20,background:'#101a27',border:'1px solid #253346'}}><span style={{width:6,height:6,borderRadius:20,background:'#34d399',boxShadow:'0 0 9px #34d399'}}/> OWNER SESSION ACTIVE</span>
            <Link href="/" target="_blank" className="rp-admin-top-link">View website ↗</Link>
          </div>
        </header>
        <div className="rp-admin-content">{children}</div>
      </main>
    </div>
  );
}

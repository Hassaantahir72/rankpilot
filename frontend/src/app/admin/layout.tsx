'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/admin#overview', icon: '📊', label: 'Overview' },
  { href: '/admin#users', icon: '👥', label: 'Users & Accounts' },
  { href: '/admin#plans', icon: '🧩', label: 'Plans & Limits' },
  { href: '/admin#settings', icon: '⚙️', label: 'Site Settings' },
  { href: '/admin#security', icon: '🛡️', label: 'Security' },
  { href: '/admin#contacts', icon: '💬', label: 'Messages' },
  { href: '/admin#billing', icon: '💰', label: 'Billing' },
  { href: '/admin#payment-methods', icon: '💳', label: 'Payment Methods' },
  { href: '/admin#log', icon: '📋', label: 'Audit Log' },
  { href: '/admin/commerce', icon: '🧾', label: 'Commerce & Orders' },
  { href: '/admin/support', icon: '🛟', label: 'Customer Support' },
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
  if (loading || !isAdmin) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#08080f',color:'#a1a1aa'}}>Verifying owner access…</main>;

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'#08080f',color:'#fff',fontFamily:"'Inter',-apple-system,sans-serif"}}>
      <aside style={{width:244,flexShrink:0,display:'flex',flexDirection:'column',background:'#101019',borderRight:'1px solid rgba(255,255,255,.08)',minHeight:'100vh',position:'sticky',top:0,height:'100vh'}}>
        <div style={{padding:'22px 18px',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
          <Link href="/admin" style={{display:'flex',alignItems:'center',gap:10,textDecoration:'none',color:'#fff'}}>
            <span style={{width:34,height:34,borderRadius:10,display:'grid',placeItems:'center',background:'linear-gradient(135deg,#f59e0b,#ef4444)',fontSize:17}}>⚡</span>
            <span style={{fontWeight:800,fontSize:16}}>RankPilot <span style={{color:'#fbbf24'}}>Control</span></span>
          </Link>
          <p style={{fontSize:10,color:'rgba(255,255,255,.35)',letterSpacing:'.12em',marginTop:10}}>OWNER ADMINISTRATION</p>
        </div>
        <nav aria-label="Admin navigation" style={{padding:'16px 10px',display:'grid',gap:5,flex:1,alignContent:'start'}}>
          {NAV.map(item => {
            const active = item.href.startsWith('/admin#') ? pathname === '/admin' && activeHash === item.href.split('#')[1] : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:11,padding:'11px 12px',borderRadius:9,textDecoration:'none',fontSize:13,fontWeight:active?700:500,color:active?'#fff':'rgba(255,255,255,.58)',background:active?'rgba(245,158,11,.12)':'transparent',border:active?'1px solid rgba(245,158,11,.25)':'1px solid transparent'}}>
              <span>{item.icon}</span>{item.label}
            </Link>;
          })}
        </nav>
        <div style={{padding:16,borderTop:'1px solid rgba(255,255,255,.08)'}}>
          <p style={{fontSize:12,color:'#fff',fontWeight:600,overflowWrap:'anywhere'}}>{user?.email || 'Owner account'}</p>
          <p style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:3,marginBottom:12}}>Secure owner session</p>
          <button onClick={logout} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',color:'rgba(255,255,255,.7)',cursor:'pointer'}}>Sign out</button>
        </div>
      </aside>
      <main style={{flex:1,minWidth:0,padding:'28px 32px',overflowX:'auto'}}>{children}</main>
    </div>
  );
}

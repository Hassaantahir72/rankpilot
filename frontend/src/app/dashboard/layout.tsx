'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ChatWidgetWrapper from '@/components/chat/ChatWidgetWrapper';

const NAV = [
  { href:'/dashboard',                    icon:'🏠', label:'Dashboard' },
  { href:'/dashboard/seo',               icon:'🔍', label:'SEO Audit' },
  { href:'/dashboard/gsc',               icon:'📊', label:'Search Console' },
  { href:'/dashboard/ads',               icon:'📣', label:'Ads & Social' },
  { href:'/dashboard/reports',           icon:'📈', label:'Reports' },
  { divider:true, label:'SEO TOOLS' },
  { href:'/dashboard/backlinks',         icon:'🔗', label:'Backlinks' },
  { href:'/dashboard/content-gap',       icon:'🎯', label:'Content Gap' },
  { href:'/dashboard/local-seo',         icon:'📍', label:'Local SEO' },
  { href:'/dashboard/schema',            icon:'🏷️', label:'Schema Markup' },
  { href:'/dashboard/pagespeed',         icon:'⚡', label:'Page Speed' },
  { href:'/dashboard/internal-links',    icon:'🔀', label:'Internal Links' },
  { href:'/dashboard/cannibalization',   icon:'⚔️', label:'Cannibalization' },
  { href:'/dashboard/sitemap',           icon:'🗺️', label:'Sitemap' },
  { href:'/dashboard/monitor',           icon:'👁️', label:'Change Monitor' },
  { divider:true, label:'MARKETING' },
  { href:'/dashboard/blog',              icon:'✍️', label:'Blog Writer' },
  { href:'/dashboard/email-marketing',   icon:'📧', label:'Email Marketing' },
  { href:'/dashboard/reviews',           icon:'⭐', label:'Reviews' },
  { href:'/dashboard/competitors',       icon:'🕵️', label:'Competitors' },
  { href:'/dashboard/pmax',              icon:'📣', label:'Google Ads PMax' },
  { divider:true, label:'ACCOUNT' },
  { href:'/dashboard/pdf-reports',       icon:'📄', label:'PDF Reports' },
  { href:'/dashboard/billing',           icon:'💳', label:'Billing' },
  { href:'/dashboard/settings',          icon:'⚙️', label:'Settings' },
  { href:'/dashboard/support',           icon:'🛟', label:'Support' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ minHeight:'100vh', background:'#08080f', display:'flex', fontFamily:"'Inter',-apple-system,sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width:collapsed?60:224, flexShrink:0, background:'rgba(255,255,255,0.025)', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', transition:'width 0.2s ease', position:'sticky', top:0, height:'100vh', overflowY:'auto', overflowX:'hidden' }}>
        {/* Logo */}
        <div style={{ padding:'18px 14px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
          {!collapsed && (
            <Link href="/dashboard" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15 }}>⚡</div>
              <span style={{ fontSize:15, fontWeight:800, color:'#fff', fontFamily:"'Plus Jakarta Sans',sans-serif", letterSpacing:'-0.01em' }}>RankPilot</span>
            </Link>
          )}
          <button onClick={()=>setCollapsed(!collapsed)} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, width:28, height:28, cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'inherit' }}>
            {collapsed?'→':'←'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'8px 8px', overflowY:'auto' }}>
          {NAV.map((item:any, i:number) => {
            if (item.divider) return (
              !collapsed ? <div key={i} style={{ padding:'12px 8px 4px', fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.2)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{item.label}</div> : <div key={i} style={{ height:8 }}/>
            );
            const active = item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 10px', borderRadius:9, marginBottom:1, background:active?'rgba(99,102,241,0.15)':'transparent', color:active?'#fff':'rgba(255,255,255,0.5)', textDecoration:'none', fontSize:13, fontWeight:active?600:400, transition:'all 0.15s', border:active?'1px solid rgba(99,102,241,0.25)':'1px solid transparent', whiteSpace:'nowrap' }}>
                <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
                {!collapsed && item.label}
              </Link>
            );
          })}

          {isAdmin && !collapsed && (
            <div style={{ padding:'12px 8px 4px', fontSize:9, fontWeight:700, color:'rgba(245,158,11,0.5)', letterSpacing:'0.08em', textTransform:'uppercase' }}>ADMIN</div>
          )}
          {isAdmin && (
            <Link href="/dashboard/admin" style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 10px', borderRadius:9, marginBottom:1, background:pathname.startsWith('/dashboard/admin')?'rgba(245,158,11,0.1)':'transparent', color:pathname.startsWith('/dashboard/admin')?'#fbbf24':'rgba(255,255,255,0.4)', textDecoration:'none', fontSize:13, fontWeight:600, border:pathname.startsWith('/dashboard/admin')?'1px solid rgba(245,158,11,0.2)':'1px solid transparent', whiteSpace:'nowrap' }}>
              <span style={{ fontSize:15 }}>⚡</span>{!collapsed&&'Admin Panel'}
            </Link>
          )}
        </nav>

        {/* User */}
        {!collapsed && user && (
          <div style={{ padding:'12px 10px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                {(user.name||user.email||'U')[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name||user.email}</p>
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'capitalize' }}>{user.plan} plan</p>
              </div>
            </div>
            <button onClick={logout} style={{ width:'100%', padding:'6px 0', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, color:'rgba(255,255,255,0.35)', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>Sign out</button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main style={{ flex:1, padding:'28px 32px', minWidth:0, maxWidth:'100%', overflowX:'hidden' }}>
        {children}
      </main>

      <ChatWidgetWrapper />
    </div>
  );
}

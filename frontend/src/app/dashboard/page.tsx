'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardApi, seoApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { UsageBar } from '@/components/dashboard/PlanGate';

const PLAN_COLORS: Record<string,string> = {free:'#6b7280',trial:'#f59e0b',starter:'#6366f1',growth:'#8b5cf6',pro:'#ec4899',agency:'#f59e0b'};

function StatCard({icon,label,value,sub,color='#6366f1',href}:any) {
  const inner = (
    <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'20px 18px',transition:'all 0.2s',cursor:href?'pointer':'default'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{width:38,height:38,borderRadius:10,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>{icon}</div>
        <span style={{fontSize:24,fontWeight:800,color:'#fff',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{value}</span>
      </div>
      <p style={{fontSize:13,color:'rgba(255,255,255,0.55)',fontWeight:500}}>{label}</p>
      {sub&&<p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:3}}>{sub}</p>}
    </div>
  );
  return href ? <Link href={href} style={{textDecoration:'none',display:'block'}}>{inner}</Link> : inner;
}

export default function DashboardPage() {
  const { user, limits, trialDaysLeft, isPaid } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.getStats(), dashboardApi.getActivity()])
      .then(([s,a]) => { setStats(s.data); setActivity(a.data.activities||[]); setWebsites(s.data.websites||[]); })
      .catch(console.error)
      .finally(()=>setLoading(false));
  }, []);

  const greeting = () => { const h=new Date().getHours(); return h<12?'morning':h<18?'afternoon':'evening'; };
  const fmt = (d:string) => {
    if(!d) return '';
    const diff = Date.now()-new Date(d).getTime();
    if(diff<60000) return 'just now';
    if(diff<3600000) return `${Math.floor(diff/60000)}m ago`;
    if(diff<86400000) return `${Math.floor(diff/3600000)}h ago`;
    return `${Math.floor(diff/86400000)}d ago`;
  };

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:32,height:32,border:'3px solid #6366f1',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{color:'rgba(255,255,255,0.3)',fontSize:13}}>Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div>
      {/* Trial warning */}
      {user?.plan==='trial'&&trialDaysLeft!==null&&(
        <div style={{marginBottom:24,padding:'14px 20px',background:trialDaysLeft<=3?'rgba(239,68,68,0.08)':'rgba(245,158,11,0.08)',border:`1px solid ${trialDaysLeft<=3?'rgba(239,68,68,0.25)':'rgba(245,158,11,0.25)'}`,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <p style={{fontSize:14,color:trialDaysLeft<=3?'#fca5a5':'#fbbf24',fontWeight:500}}>⏰ {trialDaysLeft} day{trialDaysLeft!==1?'s':''} left in your free trial</p>
          <Link href="/dashboard/billing" className="btn-primary" style={{fontSize:13,padding:'9px 20px'}}>Upgrade now →</Link>
        </div>
      )}

      {/* Free plan upsell */}
      {user?.plan==='free'&&(
        <div style={{marginBottom:24,padding:'14px 20px',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <p style={{fontSize:14,color:'#a5b4fc'}}>🚀 You're on the Free plan. Upgrade to unlock higher SEO audit and AI content limits, advanced tools, and marketing features.</p>
          <Link href="/dashboard/billing" className="btn-primary" style={{fontSize:13,padding:'9px 20px'}}>View plans →</Link>
        </div>
      )}

      {/* Header */}
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:24,fontWeight:800,fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:4}}>Good {greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:14}}>Here's your marketing performance at a glance.</p>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:14,marginBottom:28}}>
        <StatCard icon="🌐" label="Websites" value={stats?.websiteCount||0} sub="Total monitored" color="#6366f1" href="/dashboard/seo"/>
        <StatCard icon="📈" label="Rankings up" value={stats?.rankingChanges?.improved||0} sub="This week" color="#4ade80" href="/dashboard/seo"/>
        <StatCard icon="📢" label="Active campaigns" value={stats?.activeCampaigns||0} sub="Google + Meta" color="#8b5cf6" href="/dashboard/ads"/>
        <StatCard icon="🎯" label="Ad leads (month)" value={stats?.adPerformance?.conversions||0} sub={stats?.adPerformance?.spend?`$${(stats.adPerformance.spend||0).toFixed(0)} spent`:undefined} color="#ec4899" href="/dashboard/ads"/>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:20}}>
        {/* Websites */}
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <h2 style={{fontSize:15,fontWeight:700}}>Your websites</h2>
            <Link href="/dashboard/seo" style={{fontSize:13,color:'#818cf8',textDecoration:'none'}}>Manage →</Link>
          </div>
          {websites.length>0?websites.map((w:any)=>(
            <div key={w.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div>
                <p style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.85)'}}>{w.name}</p>
                <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:1}}>{w.url}</p>
              </div>
              {w.last_score!=null?(
                <div style={{textAlign:'right'}}>
                  <span style={{fontSize:18,fontWeight:800,color:w.last_score>=70?'#4ade80':w.last_score>=40?'#fbbf24':'#f87171',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{w.last_score}</span>
                  <p style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>SEO score</p>
                </div>
              ):<span style={{fontSize:12,color:'rgba(255,255,255,0.25)'}}>No audit</span>}
            </div>
          )):(
            <div style={{textAlign:'center',padding:'24px 0'}}>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.35)',marginBottom:14}}>No websites yet</p>
              <Link href="/dashboard/seo" className="btn-primary" style={{fontSize:13,padding:'9px 18px'}}>Add website →</Link>
            </div>
          )}
        </div>

        {/* Activity */}
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22}}>
          <h2 style={{fontSize:15,fontWeight:700,marginBottom:18}}>Recent activity</h2>
          {activity.length>0?activity.slice(0,6).map((a:any,i:number)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <span style={{fontSize:16,lineHeight:1.3,flexShrink:0}}>{a.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.65)',lineHeight:1.5}}>{a.text}</p>
                <p style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:2}}>{fmt(a.date)}</p>
              </div>
            </div>
          )):(
            <p style={{fontSize:13,color:'rgba(255,255,255,0.3)',textAlign:'center',padding:'24px 0'}}>Run your first SEO audit to see activity here.</p>
          )}
        </div>
      </div>

      {/* Usage bars */}
      {limits&&(
        <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22,marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
            <h2 style={{fontSize:15,fontWeight:700}}>This month's usage</h2>
            <Link href="/dashboard/billing" style={{fontSize:12,color:'rgba(255,255,255,0.4)',textDecoration:'none'}}>View plan →</Link>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:20}}>
            <UsageBar label="SEO Audits" used={stats?.usage?.audit||0} max={limits.max_audits_per_month}/>
            <UsageBar label="AI Content" used={stats?.usage?.content||0} max={limits.max_content_per_month} color="#8b5cf6"/>
            <UsageBar label="Websites" used={stats?.websiteCount||0} max={limits.max_websites} color="#ec4899"/>
            {limits.max_social_posts_per_month > 0 && <UsageBar label="Social posts" used={stats?.usage?.social||0} max={limits.max_social_posts_per_month} color="#10b981"/>}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:22}}>
        <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Quick actions</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',gap:10}}>
          {[
            {href:'/dashboard/seo',label:'Run SEO Audit',icon:'🔍',color:'#6366f1'},
            {href:'/dashboard/seo?tab=content',label:'Generate Content',icon:'✍️',color:'#8b5cf6'},
            {href:'/dashboard/ads',label:'Create Ad Campaign',icon:'📢',color:'#ec4899'},
            {href:'/dashboard/ads?tab=social',label:'Generate Social Posts',icon:'📱',color:'#4ade80'},
            {href:'/dashboard/reports',label:'Generate Report',icon:'📊',color:'#f59e0b'},
            {href:'/dashboard/billing',label:'Upgrade Plan',icon:'⚡',color:'#60a5fa'},
          ].map(a=>(
            <Link key={a.href} href={a.href} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'16px 12px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,textDecoration:'none',transition:'all 0.2s',textAlign:'center'}}>
              <div style={{width:36,height:36,borderRadius:10,background:`${a.color}18`,border:`1px solid ${a.color}28`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>{a.icon}</div>
              <span style={{fontSize:12,fontWeight:500,color:'rgba(255,255,255,0.6)',lineHeight:1.3}}>{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

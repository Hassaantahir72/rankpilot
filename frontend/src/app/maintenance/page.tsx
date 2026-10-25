export default function MaintenancePage() {
  return (
    <div style={{ minHeight:'100vh',background:'#08080f',display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <div style={{ textAlign:'center',maxWidth:480 }}>
        <div style={{ fontSize:72,marginBottom:24 }}>🔧</div>
        <h1 style={{ fontSize:32,fontWeight:900,color:'#fff',fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:16,lineHeight:1.15 }}>
          We'll be back soon
        </h1>
        <p style={{ fontSize:16,color:'rgba(255,255,255,0.45)',lineHeight:1.75,marginBottom:32 }}>
          RankPilot is currently undergoing scheduled maintenance. We're working hard to improve the platform for you.
        </p>
        <div style={{ background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:14,padding:'20px 24px',marginBottom:32 }}>
          <p style={{ fontSize:14,color:'rgba(255,255,255,0.5)',marginBottom:8 }}>Expected to be back:</p>
          <p style={{ fontSize:20,fontWeight:700,color:'#818cf8' }}>Shortly</p>
        </div>
        <p style={{ fontSize:13,color:'rgba(255,255,255,0.28)' }}>
          Questions? Email us at <a href="mailto:support@rankpilot.ai" style={{ color:'#818cf8',textDecoration:'none' }}>support@rankpilot.ai</a>
        </p>
      </div>
    </div>
  );
}

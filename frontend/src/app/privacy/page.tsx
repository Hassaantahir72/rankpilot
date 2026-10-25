import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop:100, background:'#08080f', minHeight:'100vh' }}>
        <section style={{ padding:'80px 0 120px' }}>
          <div className="container" style={{ maxWidth:760 }}>
            <div style={{ marginBottom:52 }}>
              <span className="tag" style={{ marginBottom:20 }}>Legal</span>
              <h1 style={{ fontSize:'clamp(2rem,5vw,3rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'-0.03em',marginTop:16,marginBottom:12 }}>Privacy Policy</h1>
              <p style={{ color:'rgba(255,255,255,0.35)',fontSize:14 }}>Last updated: January 1, 2024</p>
            </div>
            {[
              { title:'1. Information We Collect', body:`We collect information you provide directly to us when you create an account, use our services, or contact us. This includes:\n\n• Account information: name, email address, password\n• Website data: URLs and domains you add to RankPilot for analysis\n• Payment information: processed securely by Stripe — we never store card details\n• Usage data: how you interact with the RankPilot dashboard\n• Communications: messages you send us via email or contact forms` },
              { title:'2. How We Use Your Information', body:`We use the information we collect to:\n\n• Provide, maintain, and improve RankPilot's services\n• Process payments and send transactional emails\n• Send you weekly marketing reports and product updates\n• Respond to your comments and questions\n• Monitor and analyse usage patterns to improve the product\n• Detect and prevent fraudulent transactions and other illegal activities` },
              { title:'3. Data Sharing', body:`We do not sell, trade, or rent your personal information to third parties. We share data only with:\n\n• Service providers: Supabase (database), Stripe (payments), Groq (AI processing), Google (PageSpeed API). All are bound by data processing agreements.\n• Legal requirements: if required by law or to protect our legal rights\n• Business transfers: if RankPilot is acquired, your data may transfer to the new owner` },
              { title:'4. Data Security', body:`We implement industry-standard security measures to protect your data:\n\n• All data is encrypted in transit (TLS 1.3) and at rest (AES-256)\n• Database access is restricted to authorised personnel only\n• Regular security audits and penetration testing\n• We never store your ad platform credentials — only OAuth tokens that can be revoked\n\nDespite these measures, no system is 100% secure. We encourage you to use a strong, unique password.` },
              { title:'5. Data Retention', body:`We retain your data for as long as your account is active. When you cancel:\n\n• Your data remains accessible for 30 days so you can export it\n• After 30 days, your data is permanently deleted from all systems\n• Anonymised, aggregated analytics data may be retained indefinitely\n\nYou may request deletion of your data at any time by emailing privacy@rankpilot.ai` },
              { title:'6. Your Rights (GDPR)', body:`If you are in the European Economic Area, you have the right to:\n\n• Access the personal data we hold about you\n• Correct inaccurate personal data\n• Request deletion of your personal data\n• Object to processing of your personal data\n• Data portability — receive your data in a machine-readable format\n• Lodge a complaint with your local data protection authority\n\nTo exercise any of these rights, email privacy@rankpilot.ai` },
              { title:'7. Cookies', body:`We use cookies to:\n\n• Keep you logged in to your RankPilot account\n• Remember your preferences\n• Analyse how you use our product (via privacy-respecting analytics)\n\nWe do not use advertising cookies or third-party tracking cookies. You can disable cookies in your browser settings, but some features may not work correctly.` },
              { title:'8. Changes to This Policy', body:`We may update this Privacy Policy from time to time. We will notify you of material changes by email or by a prominent notice in the dashboard. The "last updated" date at the top of this page reflects when the policy was last changed.` },
              { title:'9. Contact Us', body:`For privacy-related questions or to exercise your rights, contact us at:\n\nEmail: privacy@rankpilot.ai\nRankPilot Ltd, incorporated in England and Wales` },
            ].map(section => (
              <div key={section.title} style={{ marginBottom:40, borderBottom:'1px solid rgba(255,255,255,0.06)', paddingBottom:40 }}>
                <h2 style={{ fontSize:18,fontWeight:700,marginBottom:16,color:'#fff' }}>{section.title}</h2>
                <div style={{ fontSize:14,color:'rgba(255,255,255,0.5)',lineHeight:'1.9',whiteSpace:'pre-line' }}>{section.body}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop:100, background:'#08080f', minHeight:'100vh' }}>
        <section style={{ padding:'80px 0 120px' }}>
          <div className="container" style={{ maxWidth:760 }}>
            <div style={{ marginBottom:52 }}>
              <span className="tag" style={{ marginBottom:20 }}>Legal</span>
              <h1 style={{ fontSize:'clamp(2rem,5vw,3rem)',fontWeight:900,fontFamily:"'Plus Jakarta Sans',sans-serif",letterSpacing:'-0.03em',marginTop:16,marginBottom:12 }}>Terms of Service</h1>
              <p style={{ color:'rgba(255,255,255,0.35)',fontSize:14 }}>Last updated: January 1, 2024</p>
            </div>
            {[
              { title:'1. Acceptance of Terms', body:`By accessing or using RankPilot ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.\n\nThese terms apply to all visitors, users, and customers of RankPilot.` },
              { title:'2. Description of Service', body:`RankPilot provides AI-powered SEO auditing, keyword research, content generation, and digital marketing automation tools. The Service is provided on a subscription basis.\n\nWe reserve the right to modify, suspend, or discontinue any aspect of the Service at any time with reasonable notice.` },
              { title:'3. Account Registration', body:`To use RankPilot, you must create an account with a valid email address and password. You are responsible for:\n\n• Maintaining the confidentiality of your account credentials\n• All activities that occur under your account\n• Notifying us immediately of any unauthorised use\n\nYou must be at least 16 years old to use the Service.` },
              { title:'4. Subscriptions and Payments', body:`RankPilot is offered on a monthly or annual subscription basis.\n\n• All prices are in USD unless otherwise stated\n• Subscriptions auto-renew unless cancelled before the renewal date\n• A separate 14-day Free Trial is available without a credit card; paid subscriptions begin only after checkout\n• Payment is processed by the configured third-party payment provider; available methods are shown at checkout\n• Annual subscriptions are non-refundable after 30 days, except where required by law\n• We offer a 30-day money-back guarantee on monthly subscriptions` },
              { title:'5. Acceptable Use', body:`You agree not to use the Service to:\n\n• Violate any applicable laws or regulations\n• Infringe the intellectual property rights of others\n• Transmit malware, viruses, or other harmful code\n• Scrape or harvest data in a manner that burdens our infrastructure\n• Resell or sublicense the Service without our written permission (except Agency plan holders)\n• Use the Service for any illegal or fraudulent purpose\n\nViolation of these terms may result in immediate termination of your account.` },
              { title:'6. AI-Generated Content', body:`RankPilot uses AI to generate SEO content, ad copy, and marketing recommendations. You acknowledge that:\n\n• AI-generated content may contain errors and should be reviewed before publishing\n• You are responsible for all content published using RankPilot's output\n• We make no guarantee that AI-generated content will achieve specific ranking or performance results\n• You retain full ownership of content generated using your account` },
              { title:'7. Third-Party Integrations', body:`RankPilot integrates with third-party services including Google Ads, Meta Ads, and Supabase. Your use of these integrations is also subject to their respective terms of service. We are not responsible for the actions or availability of third-party platforms.` },
              { title:'8. Limitation of Liability', body:`To the maximum extent permitted by applicable law, RankPilot shall not be liable for:\n\n• Any indirect, incidental, special, or consequential damages\n• Loss of profits, revenue, data, or business opportunity\n• Damages resulting from your use or inability to use the Service\n\nOur total liability to you shall not exceed the amount you paid us in the 12 months preceding the claim.` },
              { title:'9. Termination', body:`Either party may terminate this agreement at any time.\n\n• You may cancel your subscription from your account settings at any time\n• We may terminate your account for violation of these terms\n• Upon termination, your data will be retained for 30 days before deletion\n• Clauses that by their nature should survive termination will do so` },
              { title:'10. Governing Law', body:`These Terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.\n\nFor questions about these Terms, contact us at legal@rankpilot.ai` },
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

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div style={{ paddingTop:100, background:'#08080f', minHeight:'100vh', display:'flex', alignItems:'center' }}>
        <div className="container" style={{ textAlign:'center', padding:'80px 24px' }}>
          <div style={{ fontSize:80, marginBottom:24, opacity:0.6 }}>🛸</div>
          <h1 style={{ fontSize:'clamp(4rem,12vw,8rem)', fontWeight:900, fontFamily:"'Plus Jakarta Sans',sans-serif", lineHeight:1, marginBottom:16, background:'linear-gradient(135deg,rgba(255,255,255,0.5),rgba(255,255,255,0.1))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>404</h1>
          <h2 style={{ fontSize:'clamp(1.2rem,3vw,1.8rem)', fontWeight:700, marginBottom:16 }}>Page not found</h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.4)', maxWidth:400, margin:'0 auto 40px', lineHeight:1.7 }}>
            The page you are looking for doesn't exist or has been moved.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/" className="btn-primary" style={{ fontSize:15, padding:'13px 28px' }}>Go home →</Link>
            <Link href="/contact" className="btn-ghost" style={{ fontSize:15, padding:'13px 28px' }}>Contact support</Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

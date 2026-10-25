'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, AuthProvider } from '@/lib/auth';

function CallbackInner() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');
    if (error) { router.push(`/auth/login?error=${error}`); return; }
    if (!token) { router.push('/auth/login'); return; }
    // Store token, fetch user profile
    localStorage.setItem('rp_token', token);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) { login(token, data.user); router.push('/dashboard'); }
        else router.push('/auth/login');
      })
      .catch(() => router.push('/auth/login'));
  }, []);

  return (
    <div style={{minHeight:'100vh',background:'#08080f',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,border:'3px solid #6366f1',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 20px'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:14}}>Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return <AuthProvider><CallbackInner/></AuthProvider>;
}

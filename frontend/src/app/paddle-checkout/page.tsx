'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';

function PaddleCheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const transactionId = params.get('_ptxn') || '';
  const initialized = useRef(false);
  const [status, setStatus] = useState('Preparing secure Paddle checkout…');
  const [error, setError] = useState('');

  const confirmPayment = useCallback(async () => {
    setStatus('Payment received. Waiting for RankPilot to confirm your subscription…');
    setError('');
    for (let attempt = 0; attempt < 15; attempt += 1) {
      try {
        const { data } = await authApi.me();
        const user = data?.user;
        if (user && ['starter','growth','pro','agency'].includes(user.plan) && user.subscription_status === 'active') {
          if (user.onboarding_completed) router.replace('/dashboard');
          else router.replace('/onboarding?checkout=complete&plan=' + encodeURIComponent(user.plan));
          return;
        }
      } catch {
        // Keep polling; the webhook may still be processing.
      }
      await new Promise(resolve => window.setTimeout(resolve, 2000));
    }
    setStatus('Your checkout completed. Subscription confirmation is taking longer than usual.');
    setError('Keep this page open and select “Check payment status” in a moment. Your plan will not activate until Paddle confirms the payment.');
  }, [router]);

  const initializePaddle = useCallback(() => {
    if (initialized.current) return;
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const paddle = (window as any).Paddle;
    if (!token || !paddle || !transactionId) {
      setError(!transactionId ? 'The Paddle transaction link is missing. Return to checkout and try again.' : 'Paddle checkout is not configured yet.');
      setStatus('Secure checkout is unavailable.');
      return;
    }
    try {
      if (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox') paddle.Environment.set('sandbox');
      paddle.Initialize({
        token,
        eventCallback: (event: any) => {
          if (event?.name === 'checkout.completed') void confirmPayment();
          if (event?.name === 'checkout.payment.failed') {
            setStatus('Payment was not completed.');
            setError('No paid plan has been activated. You can return to checkout and try again.');
          }
        },
      });
      initialized.current = true;
      setStatus('Paddle secure checkout is opening…');
    } catch {
      setStatus('Could not initialize secure checkout.');
      setError('Check the Paddle client token and environment configured for this website.');
    }
  }, [confirmPayment, transactionId]);

  useEffect(() => {
    if (!transactionId) {
      setStatus('Secure checkout link is incomplete.');
      setError('Return to the plan checkout page and start again.');
    }
  }, [transactionId]);

  return (
    <main style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:24, background:'#08080f', color:'#fff', fontFamily:'Inter,system-ui,sans-serif' }}>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onReady={initializePaddle} />
      <section style={{ width:'100%', maxWidth:480, padding:30, border:'1px solid rgba(255,255,255,.12)', borderRadius:18, background:'rgba(255,255,255,.035)', textAlign:'center' }}>
        <div style={{ width:44,height:44,display:'grid',placeItems:'center',margin:'0 auto 18px',borderRadius:13,background:'rgba(99,102,241,.18)',color:'#c7d2fe',fontSize:21 }}>🔒</div>
        <h1 style={{ fontSize:23,fontWeight:850,marginBottom:10 }}>Secure payment</h1>
        <p style={{ color:'rgba(255,255,255,.62)',fontSize:13,lineHeight:1.7 }}>{status}</p>
        {error && <p role="alert" style={{ marginTop:14,color:'#fbbf24',fontSize:12,lineHeight:1.6 }}>{error}</p>}
        {error && transactionId && <button onClick={() => void confirmPayment()} style={{ marginTop:18,padding:'11px 16px',border:0,borderRadius:10,background:'#6366f1',color:'#fff',fontWeight:750,cursor:'pointer' }}>Check payment status</button>}
        <p style={{ marginTop:20,color:'rgba(255,255,255,.35)',fontSize:11 }}>RankPilot activates paid features only after server-verified payment confirmation.</p>
      </section>
    </main>
  );
}

export default function PaddleCheckoutPage() {
  return <Suspense fallback={<main style={{ minHeight:'100vh',display:'grid',placeItems:'center',background:'#08080f',color:'#fff' }}>Loading secure checkout…</main>}><PaddleCheckoutContent /></Suspense>;
}

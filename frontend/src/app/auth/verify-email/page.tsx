'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get('userId');
  const type = params.get('type') || 'verify';

  useEffect(() => {
    if (!userId) { router.push('/auth/signup'); return; }
    const timer = setInterval(() => setCountdown(c => c > 0 ? c - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, [userId, router]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(d => d !== '')) handleVerify(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      handleVerify(text);
    }
  };

  const handleVerify = async (code: string) => {
    setError(''); setLoading(true);
    try {
      const endpoint = type === 'login' ? '/auth/verify-login-otp' : '/auth/verify-otp';
      const { data } = await api.post(endpoint, { userId, otp: code });
      if (data.token) {
        localStorage.setItem('rp_token', data.token);
        localStorage.setItem('rp_user', JSON.stringify(data.user));
        const selectedPlan = params.get('plan');
        const allowedPlans = ['starter', 'growth', 'pro', 'agency'];
        if (type !== 'login' && selectedPlan && allowedPlans.includes(selectedPlan)) {
          const selectedInterval = params.get('interval') === 'annual' ? '&interval=annual' : '';
          router.push(`/dashboard/billing?plan=${encodeURIComponent(selectedPlan)}${selectedInterval}`);
        } else if (type !== 'login') {
          router.push('/onboarding?flow=trial');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code. Try again.');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
    setLoading(false);
  };

  const resend = async () => {
    if (countdown > 0) return;
    setResending(true); setError('');
    try {
      await api.post('/auth/resend-otp', { userId });
      setSuccess('New code sent!');
      setCountdown(60);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not resend code.');
    }
    setResending(false);
  };

  const isLogin = type === 'login';

  return (
    <div style={{ minHeight: '100vh', background: '#08080f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 40% at 50% 0%,rgba(99,102,241,0.12),transparent)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>R</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>RankPilot</span>
          </Link>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{isLogin ? '🔐' : '📧'}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            {isLogin ? 'Enter your login code' : 'Verify your email'}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
            {isLogin ? 'We sent a 6-digit code to your email for security.' : 'Enter the 6-digit code we sent to your email to activate your account.'}
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36 }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.22)', color: '#4ade80', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
              {success}
            </div>
          )}

          {/* OTP inputs */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }} onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 52, height: 60, textAlign: 'center', fontSize: 24, fontWeight: 700,
                  background: digit ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${digit ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 12, color: '#fff', outline: 'none', fontFamily: 'monospace',
                  transition: 'all 0.2s', caretColor: '#818cf8',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                onBlur={e => e.target.style.borderColor = digit ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}
              />
            ))}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', color: '#818cf8', fontSize: 14, marginBottom: 20 }}>
              Verifying...
            </div>
          )}

          <button
            onClick={() => otp.every(d => d) && handleVerify(otp.join(''))}
            disabled={loading || otp.some(d => !d)}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', fontSize: 15, padding: '13px', marginBottom: 16 }}>
            {loading ? 'Verifying...' : 'Verify Code →'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
              Didn't receive the code?
            </p>
            <button
              onClick={resend}
              disabled={countdown > 0 || resending}
              style={{ background: 'none', border: 'none', color: countdown > 0 ? 'rgba(255,255,255,0.25)' : '#818cf8', cursor: countdown > 0 ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' }}>
              {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          <Link href="/auth/login" style={{ color: '#818cf8', textDecoration: 'none' }}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

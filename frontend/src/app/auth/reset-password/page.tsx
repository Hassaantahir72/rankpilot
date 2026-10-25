'use client';
import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const params = useSearchParams();
  const userId = params.get('userId');
  const router = useRouter();

  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (next.every(d => d !== '')) setStep('password');
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/auth/reset-password', { userId, otp: otp.join(''), password });
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. Please try again.');
    }
    setLoading(false);
  };

  if (!userId) return (
    <div style={{ minHeight: '100vh', background: '#08080f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>Invalid reset link.</p>
        <Link href="/auth/forgot-password" className="btn-primary">Request new link</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#08080f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 40% at 50% 0%,rgba(99,102,241,0.12),transparent)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>R</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>RankPilot</span>
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>Reset your password</h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>
            {step === 'code' ? 'Enter the 6-digit code from your email.' : 'Now choose a new strong password.'}
          </p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 36 }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Password reset!</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)' }}>Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5', padding: '12px 16px', borderRadius: 10, fontSize: 14, marginBottom: 20, textAlign: 'center' }}>{error}</div>}

              {/* Step 1: OTP */}
              <div style={{ marginBottom: step === 'code' ? 28 : 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  Step 1 — Enter reset code
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={el => { inputs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
                      style={{ width: 48, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700, background: digit ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${digit ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, color: '#fff', outline: 'none', fontFamily: 'monospace', transition: 'all 0.2s' }} />
                  ))}
                </div>
              </div>

              {/* Step 2: New password */}
              {step === 'password' && (
                <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 4 }} />
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Step 2 — New password</p>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New password</label>
                    <input className="input-dark" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.38)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm password</label>
                    <input className="input-dark" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ justifyContent: 'center', fontSize: 15, padding: '13px' }}>
                    {loading ? 'Resetting...' : 'Reset password →'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13 }}>
          <Link href="/auth/login" style={{ color: '#818cf8', textDecoration: 'none' }}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

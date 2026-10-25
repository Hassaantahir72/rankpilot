'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const FEATURE_PLAN: Record<string, string> = {
  google_ads:          'growth',
  meta_ads:            'pro',
  ab_testing:          'pro',
  white_label:         'agency',
  api_access:          'agency',
  competitor_analysis: 'growth',
  weekly_reports:      'growth',
  social_posts:        'growth',
  ads:                 'growth',
  email_marketing:     'starter',
  pdf_reports:         'pro',
};

const PLAN_LABELS: Record<string, string> = {
  free:    'Free',
  trial:   'Trial',
  starter: 'Starter ($99/mo)',
  growth:  'Growth ($299/mo)',
  pro:     'Pro ($499/mo)',
  agency:  'Agency ($999/mo)',
};

interface PlanGateProps {
  feature: string;
  requiredPlan?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PlanGate({ feature, requiredPlan, children, fallback }: PlanGateProps) {
  const { canUse, user } = useAuth();

  // canUse may not be available yet — guard against it
  if (typeof canUse !== 'function') return <>{children}</>;

  if (canUse(feature)) return <>{children}</>;

  const needed = requiredPlan || FEATURE_PLAN[feature] || 'growth';

  if (fallback) return <>{fallback}</>;

  return (
    <div style={{
      background: 'rgba(99,102,241,0.06)',
      border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: 14,
      padding: '28px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        {PLAN_LABELS[needed] || needed} required
      </h3>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20, lineHeight: 1.6 }}>
        This feature is available on the <strong style={{ color: '#818cf8' }}>{PLAN_LABELS[needed]}</strong> plan or higher.
        {user?.plan === 'free' && ' Upgrade to unlock the full power of RankPilot.'}
      </p>
      <Link href="/dashboard/billing" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 24px',
        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        borderRadius: 10,
        color: '#fff',
        fontWeight: 600,
        fontSize: 14,
        textDecoration: 'none',
      }}>
        Upgrade Plan →
      </Link>
    </div>
  );
}

interface UsageBarProps {
  label: string;
  used: number;
  max: number;
  color?: string;
}

export function UsageBar({ label, used, max, color = '#6366f1' }: UsageBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 0;
  const safeUsed = Number.isFinite(used) && used > 0 ? used : 0;
  const percent = safeMax > 0 ? Math.min(100, (safeUsed / safeMax) * 100) : safeUsed > 0 ? 100 : 0;
  const maxLabel = safeMax === 9999 ? 'Unlimited' : safeMax.toLocaleString();

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 13 }}>
        <span style={{ color: 'rgba(255,255,255,0.72)' }}>{label}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
          {safeUsed.toLocaleString()} / {maxLabel}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.min(100, percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}
      >
        <div style={{ height: '100%', width: `${percent}%`, borderRadius: 999, background: color, transition: 'width 200ms ease' }} />
      </div>
    </div>
  );
}

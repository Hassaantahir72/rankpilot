'use client';

import { useEffect, useState } from 'react';
import { paymentMethodsApi } from '@/lib/api';

type PaymentMethod = { id: string; provider: string; name: string; description: string; config?: Record<string, unknown> };

export default function AvailablePaymentMethods({ compact = false }: { compact?: boolean }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    let active = true;
    paymentMethodsApi.listPublic()
      .then(({ data }) => { if (active) setMethods(Array.isArray(data.methods) ? data.methods : []); })
      .catch(() => { if (active) setMethods([]); });
    return () => { active = false; };
  }, []);

  if (!methods.length) return null;

  return (
    <section aria-label="Available payment methods" style={{ margin: compact ? '16px 0' : '32px 0', padding: compact ? 14 : 20, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, background: 'rgba(255,255,255,0.02)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Available payment methods</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {methods.map(method => (
          <div key={method.id} style={{ minWidth: 180, flex: '1 1 180px', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{method.name}</p>
            {method.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{method.description}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

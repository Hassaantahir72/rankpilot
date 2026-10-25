'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  email_verified: boolean;
  role: string;
}

interface Limits {
  max_websites: number;
  max_audits_per_month: number;
  max_content_per_month: number;
  max_social_posts_per_month: number;
  google_ads: boolean;
  meta_ads: boolean;
  competitor_analysis: boolean;
  weekly_reports: boolean;
  ab_testing: boolean;
  white_label: boolean;
  api_access: boolean;
}

interface AuthContextType {
  user: User | null;
  limits: Limits | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  canUse: (feature: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  limits: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  login: () => {},
  logout: () => {},
  canUse: () => false,
  refreshUser: async () => {},
});

const PLAN_ORDER = ['free', 'trial', 'starter', 'growth', 'pro', 'agency'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('rp_token');
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const { data } = await authApi.me();
      setUser(data.user);
      setLimits(data.limits);
    } catch {
      localStorage.removeItem('rp_token');
      localStorage.removeItem('rp_user');
      setUser(null);
      setLimits(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (token: string, userData: User) => {
    localStorage.setItem('rp_token', token);
    localStorage.setItem('rp_user', JSON.stringify(userData));
    setUser(userData);
    refreshUser();
  };

  const logout = () => {
    localStorage.removeItem('rp_token');
    localStorage.removeItem('rp_user');
    setUser(null);
    setLimits(null);
    router.push('/auth/login');
  };

  // canUse — checks if user's plan supports a feature
  const canUse = (feature: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'superadmin') return true;
    if (!limits) return false;

    const featureMap: Record<string, keyof Limits> = {
      google_ads:          'google_ads',
      meta_ads:            'meta_ads',
      competitor_analysis: 'competitor_analysis',
      weekly_reports:      'weekly_reports',
      ab_testing:          'ab_testing',
      white_label:         'white_label',
      api_access:          'api_access',
      social_posts:        'max_social_posts_per_month',
    };

    const limitKey = featureMap[feature];
    if (limitKey) {
      const val = limits[limitKey];
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val > 0;
    }

    // Plan-based feature gates
    const planGates: Record<string, string> = {
      ads:          'growth',
      email_marketing: 'starter',
      reports:      'trial',
      advanced_seo: 'starter',
    };

    const minPlan = planGates[feature];
    if (minPlan) {
      const userPlanIdx = PLAN_ORDER.indexOf(user.plan);
      const minPlanIdx  = PLAN_ORDER.indexOf(minPlan);
      return userPlanIdx >= minPlanIdx;
    }

    return true; // default allow
  };

  const isAdmin      = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <AuthContext.Provider value={{ user, limits, loading, isAdmin, isSuperAdmin, login, logout, canUse, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

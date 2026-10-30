import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('rp_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/auth')) {
        localStorage.removeItem('rp_token');
        localStorage.removeItem('rp_user');
        window.location.href = '/auth/login';
      }
    }
    // Show maintenance mode message
    if (err.response?.data?.code === 'MAINTENANCE_MODE' && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/auth/login')) {
        window.location.href = '/maintenance';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── AUTH ──────────────────────────────────────────────────────────
export const authApi = {
  register:       (d: any)           => api.post('/auth/register', d),
  verifyOTP:      (d: any)           => api.post('/auth/verify-otp', d),
  resendOTP:      (d: any)           => api.post('/auth/resend-otp', d),
  login:          (d: any)           => api.post('/auth/login', d),
  verifyLoginOTP: (d: any)           => api.post('/auth/verify-login-otp', d),
  me:             ()                 => api.get('/auth/me'),
  forgotPassword: (email: string)    => api.post('/auth/forgot-password', { email }),
  resetPassword:  (d: any)           => api.post('/auth/reset-password', d),
  logout:         ()                 => api.post('/auth/logout'),
  completeOnboarding: ()             => api.post('/auth/onboarding/complete'),
  clearSignupPlan:   ()               => api.post('/auth/signup-plan/clear'),
};

// ── SEO ───────────────────────────────────────────────────────────
export const seoApi = {
  addWebsite:        (d: any)                    => api.post('/seo/websites', d),
  getWebsites:       ()                          => api.get('/seo/websites'),
  deleteWebsite:     (id: string)                => api.delete(`/seo/websites/${id}`),
  runAudit:          (wid: string)               => api.post(`/seo/websites/${wid}/audit`),
  getAudits:         (wid: string)               => api.get(`/seo/websites/${wid}/audits`),
  getAuditDetail:    (wid: string, aid: string)  => api.get(`/seo/websites/${wid}/audits/${aid}`),
  getKeywords:       (wid: string)               => api.get(`/seo/websites/${wid}/keywords`),
  generateContent:   (wid: string, d: any)       => api.post(`/seo/websites/${wid}/content`, d),
  getContentHistory: (wid: string)               => api.get(`/seo/websites/${wid}/content`),
  getRankings:       (wid: string)               => api.get(`/seo/websites/${wid}/rankings`),
  getCompetitors:    (wid: string)               => api.get(`/seo/websites/${wid}/competitors`),
  analyzeCompetitors:(wid: string)               => api.post(`/seo/websites/${wid}/competitors`),
  getTechnicalIssues:(wid: string)               => api.get(`/seo/websites/${wid}/technical`),
};

// ── ADS ───────────────────────────────────────────────────────────
export const adsApi = {
  getOverview:           (siteId: string) => api.get(`/ads/overview/${siteId}`),
  getGoogleCampaigns:    ()               => api.get('/ads/google/campaigns'),
  createGoogleCampaign:  (d: any)         => api.post('/ads/google/campaigns', d),
  getGooglePerformance:  (p?: any)        => api.get('/ads/google/performance', { params: p }),
  getMetaCampaigns:      ()               => api.get('/ads/meta/campaigns'),
  createMetaCampaign:    (d: any)         => api.post('/ads/meta/campaigns', d),
  generateAdCopy:        (d: any)         => api.post('/ads/generate-copy', d),
  generateSocialContent: (d: any)         => api.post('/ads/social/generate', d),
  getSocialCalendar:     (wid: string)    => api.get(`/ads/social/calendar/${wid}`),
};

// ── DASHBOARD ─────────────────────────────────────────────────────
export const dashboardApi = {
  getStats:    () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
};

// ── REPORTS ───────────────────────────────────────────────────────
export const reportsApi = {
  getAll:    ()          => api.get('/reports'),
  getOne:    (id:string) => api.get(`/reports/${id}`),
  generate:  (wid:string)=> api.post('/reports/generate', { websiteId: wid }),
};

// ── PUBLIC PAYMENT METHODS ────────────────────────────────────────
export const paymentMethodsApi = {
  listPublic: () => api.get('/payment-methods'),
};

// ── BILLING ───────────────────────────────────────────────────────
export const billingApi = {
  createCheckout: (priceId: string) => api.post('/webhooks/create-checkout', { priceId }),
  createProviderCheckout: (provider: string, plan: string, interval: 'monthly'|'annual' = 'monthly', billingDetails?: { name: string; email: string; country: string; state?: string; zip?: string; taxNumber?: string }) => api.post('/payment-methods/checkout', { provider, plan, interval, billingDetails }),
  openPortal:     ()                => api.post('/webhooks/portal'),
  openProviderPortal: ()             => api.post('/payment-methods/portal'),
};

// ── ADMIN ─────────────────────────────────────────────────────────
export const adminApi = {
  // Stats
  getStats:    ()        => api.get('/admin/stats'),
  getGrowth:   ()        => api.get('/admin/growth'),

  // Users
  getUsers:    (p?: any) => api.get('/admin/users', { params: p }),
  getUser:     (id:string)=> api.get(`/admin/users/${id}`),
  createUserBillingPortal: (id:string) => api.post(`/admin/users/${id}/billing-portal`),
  updatePlan:  (id:string,d:any) => api.patch(`/admin/users/${id}/plan`, d),
  toggleBan:   (id:string,d:any) => api.patch(`/admin/users/${id}/ban`, d),
  updateRole:  (id:string,d:any) => api.patch(`/admin/users/${id}/role`, d),
  verifyEmail: (id:string)       => api.patch(`/admin/users/${id}/verify`),
  resetPassword:(id:string,d:any)=> api.patch(`/admin/users/${id}/password`, d),
  impersonate: (id:string)       => api.post(`/admin/users/${id}/impersonate`),
  deleteUser:  (id:string)       => api.delete(`/admin/users/${id}`),

  // Payment methods (superadmin only)
  getPaymentMethods: () => api.get('/admin/payment-methods'),
  createPaymentMethod: (d:any) => api.post('/admin/payment-methods', d),
  updatePaymentMethod: (id:string,d:any) => api.patch(`/admin/payment-methods/${id}`, d),
  deletePaymentMethod: (id:string) => api.delete(`/admin/payment-methods/${id}`),

  // Site settings
  getSiteSettings: ()            => api.get('/admin/settings'),
  updateSetting:   (key:string,d:any) => api.patch(`/admin/settings/${key}`, d),

  // Security
  getSecurityEvents: (p?:any)    => api.get('/admin/security/events', { params: p }),
  getBlockedIPs:     ()          => api.get('/admin/security/blocked-ips'),
  blockIP:           (d:any)     => api.post('/admin/security/block-ip', d),
  unblockIP:         (ip:string) => api.delete(`/admin/security/block-ip/${encodeURIComponent(ip)}`),

  // Content
  getContacts:       (p?:any)    => api.get('/admin/contacts', { params: p }),
  updateContact:     (id:string,d:any) => api.patch(`/admin/contacts/${id}`, d),
  getAuditLog:       (p?:any)    => api.get('/admin/audit-log', { params: p }),
  getBilling:        ()          => api.get('/admin/billing'),
  // Commerce ledger (requires the backend ledger migration)
  getCommerceSummary:()          => api.get('/admin/commerce/summary'),
  getOrders:         (p?:any)     => api.get('/admin/commerce/orders', { params: p }),
  getTransactions:   (p?:any)     => api.get('/admin/commerce/transactions', { params: p }),
  getProviderEvents: (p?:any)     => api.get('/admin/commerce/provider-events', { params: p }),
};

// ── CONTACT ───────────────────────────────────────────────────────
export const contactApi = {
  send: (d: any) => api.post('/contact', d),
};

// ── SUPPORT ───────────────────────────────────────────────────────
export const supportApi = {
  chat:         (d: any)          => api.post('/support/chat', d),
  requestAgent: (d: any)          => api.post('/support/chat/request-agent', d),
  createTicket: (d: any)          => api.post('/support/tickets', d),
  getTickets:   ()                => api.get('/support/tickets'),
  getTicket:    (id: string)      => api.get(`/support/tickets/${id}`),
  replyTicket:  (id:string,d:any) => api.post(`/support/tickets/${id}/reply`, d),
  rateTicket:   (id:string,d:any) => api.post(`/support/tickets/${id}/rate`, d),
  // Admin
  adminStats:   ()                => api.get('/support/admin/stats'),
  adminTickets: (p?:any)          => api.get('/support/admin/tickets', { params: p }),
  adminTicket:  (id:string)       => api.get(`/support/admin/tickets/${id}`),
  adminReply:   (id:string,d:any) => api.post(`/support/admin/tickets/${id}/reply`, d),
  adminUpdate:  (id:string,d:any) => api.patch(`/support/admin/tickets/${id}`, d),
  adminChats:   ()                => api.get('/support/admin/chats'),
  adminCanned:  ()                => api.get('/support/admin/canned'),
};

// ── GOOGLE SEARCH CONSOLE ────────────────────────────────────────
export const gscApi = {
  getStatus:    ()              => api.get('/gsc/status'),
  getSites:     ()              => api.get('/gsc/sites'),
  syncRankings: (wid: string, siteUrl?: string) => api.post(`/gsc/sync/${wid}`, { siteUrl }),
  getKeywords:  (wid: string)   => api.get(`/gsc/keywords/${wid}`),
  getPages:     (wid: string)   => api.get(`/gsc/pages/${wid}`),
  getTrend:     (wid: string)   => api.get(`/gsc/trend/${wid}`),
};

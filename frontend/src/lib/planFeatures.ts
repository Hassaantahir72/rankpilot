export type PublicPlanLimits = {
  plan: string;
  max_websites?: number;
  max_keywords?: number;
  max_audits_per_month?: number;
  max_content_per_month?: number;
  max_social_posts_per_month?: number;
  rank_tracking_frequency?: string;
  competitor_analysis?: boolean;
  google_ads?: boolean;
  meta_ads?: boolean;
  weekly_reports?: boolean;
  priority_support?: boolean;
  white_label?: boolean;
};

const DEFAULTS: Record<string, Omit<PublicPlanLimits, 'plan'>> = {
  starter: { max_websites: 1, max_keywords: 150, max_audits_per_month: 5, max_content_per_month: 10, max_social_posts_per_month: 0, rank_tracking_frequency: 'monthly', competitor_analysis: true, google_ads: false, meta_ads: false, weekly_reports: false, priority_support: false, white_label: false },
  growth: { max_websites: 3, max_keywords: 300, max_audits_per_month: 15, max_content_per_month: 30, max_social_posts_per_month: 10, rank_tracking_frequency: 'weekly', competitor_analysis: true, google_ads: true, meta_ads: false, weekly_reports: true, priority_support: true, white_label: false },
  pro: { max_websites: 5, max_keywords: 500, max_audits_per_month: 40, max_content_per_month: 80, max_social_posts_per_month: 30, rank_tracking_frequency: 'weekly', competitor_analysis: true, google_ads: true, meta_ads: true, weekly_reports: true, priority_support: true, white_label: false },
  agency: { max_websites: 10, max_keywords: 1000, max_audits_per_month: 100, max_content_per_month: 200, max_social_posts_per_month: 100, rank_tracking_frequency: 'weekly', competitor_analysis: true, google_ads: true, meta_ads: true, weekly_reports: true, priority_support: true, white_label: false },
};

export function getPlanFeatureLines(plan: string, row?: PublicPlanLimits) {
  const fallback = DEFAULTS[plan] || DEFAULTS.starter;
  const value = { ...fallback, ...(row || {}) };
  const frequency = String(value.rank_tracking_frequency || 'monthly');
  return [
    `${value.max_websites ?? fallback.max_websites} website${(value.max_websites ?? fallback.max_websites) === 1 ? '' : 's'}`,
    `${value.max_keywords ?? fallback.max_keywords} tracked keywords`,
    `${value.max_audits_per_month ?? fallback.max_audits_per_month} SEO audits/month`,
    `${value.max_content_per_month ?? fallback.max_content_per_month} AI content generations/month`,
    `${frequency.charAt(0).toUpperCase() + frequency.slice(1)} rank tracking`,
    ...(value.competitor_analysis ? ['Competitor analysis'] : []),
    ...(value.google_ads ? ['Google Ads AI tools'] : []),
    ...(value.meta_ads ? ['Meta Ads AI tools'] : []),
    ...((value.max_social_posts_per_month || 0) > 0 ? [`${value.max_social_posts_per_month} social posts/month`] : []),
    ...(value.weekly_reports ? ['Weekly reports'] : []),
    ...(value.priority_support ? ['Priority support'] : []),
    ...(value.white_label ? ['White-label reporting'] : []),
  ];
}

export function getPlanComparisonRows(plans: PublicPlanLimits[]) {
  const get = (id: string) => ({ ...(DEFAULTS[id] || DEFAULTS.starter), ...(plans.find(p => p.plan === id) || {}) });
  const starter = get('starter');
  const growth = get('growth');
  const pro = get('pro');
  const agency = get('agency');
  const format = (v: any) => v ? '✓' : '—';
  const social = (v: number) => v > 0 ? `${v}/mo` : '—';
  return [
    { f: 'Websites', s: String(starter.max_websites), g: String(growth.max_websites), p: String(pro.max_websites), a: String(agency.max_websites) },
    { f: 'Tracked Keywords', s: String(starter.max_keywords), g: String(growth.max_keywords), p: String(pro.max_keywords), a: String(agency.max_keywords) },
    { f: 'SEO Audits / month', s: String(starter.max_audits_per_month), g: String(growth.max_audits_per_month), p: String(pro.max_audits_per_month), a: String(agency.max_audits_per_month) },
    { f: 'AI Content / month', s: String(starter.max_content_per_month), g: String(growth.max_content_per_month), p: String(pro.max_content_per_month), a: String(agency.max_content_per_month) },
    { f: 'Rank Tracking', s: String(starter.rank_tracking_frequency), g: String(growth.rank_tracking_frequency), p: String(pro.rank_tracking_frequency), a: String(agency.rank_tracking_frequency) },
    { f: 'Competitor Analysis', s: format(starter.competitor_analysis), g: format(growth.competitor_analysis), p: format(pro.competitor_analysis), a: format(agency.competitor_analysis) },
    { f: 'Google Ads AI', s: format(starter.google_ads), g: format(growth.google_ads), p: format(pro.google_ads), a: format(agency.google_ads) },
    { f: 'Meta Ads AI', s: format(starter.meta_ads), g: format(growth.meta_ads), p: format(pro.meta_ads), a: format(agency.meta_ads) },
    { f: 'Social Media Posts', s: social(starter.max_social_posts_per_month || 0), g: social(growth.max_social_posts_per_month || 0), p: social(pro.max_social_posts_per_month || 0), a: social(agency.max_social_posts_per_month || 0) },
    { f: 'Weekly Reports', s: format(starter.weekly_reports), g: format(growth.weekly_reports), p: format(pro.weekly_reports), a: format(agency.weekly_reports) },
    { f: 'Priority Support', s: format(starter.priority_support), g: format(growth.priority_support), p: format(pro.priority_support), a: format(agency.priority_support) },
    { f: 'White-label Reporting', s: format(starter.white_label), g: format(growth.white_label), p: format(pro.white_label), a: format(agency.white_label) },
  ];
}

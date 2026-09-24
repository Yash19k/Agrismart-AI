import {
  LayoutDashboard,
  MapPin,
  ShieldAlert,
  Bug,
  Activity,
  CloudSun,
  CalendarCheck,
  Building2,
  UserCheck,
  Flame,
  Database,
  Droplets,
  Sprout,
  Leaf,
  Bot
} from 'lucide-react';

/**
 * Unified Navigation Configuration for AgriSmart-AI.
 * Single source of truth for all routes, permissions, and sidebar items.
 *
 * Ordered strictly according to the canonical 10-stage Problem Statement workflow:
 *
 * Farmer Workflow:
 *   Stage 0: My Farm (/farm)
 *   Stage 1a: Scan Leaf (/disease)
 *   Stage 1b: Pest & Sensor (/pests)
 *   Stage 2/4: Risk Forecast (/risk)
 *   Weather Context (/weather)
 *   Stage 7: Follow-ups (/followups)
 *   Stage 6: Referrals (/referrals)
 *   More Tools: Irrigation, Crop Recommendation, Sustainability, AI Agronomist
 *
 * Expert Workflow:
 *   Dashboard (/dashboard)
 *   Stage 5: Review Queue (/expert)
 *   Stage 6: Referrals (/referrals)
 *   Stage 9: Hotspots (/hotspots)
 *
 * Officer Workflow:
 *   Dashboard (/dashboard)
 *   Stage 9: Regional Monitoring (/regional-monitoring)
 *   Stage 5: Review Queue (/expert)
 *   Stage 6: Referrals (/referrals)
 *   Stage 9: Hotspots (/hotspots)
 *   Stage 8: Feedback Dataset (/feedback)
 */

export const NAV_ITEMS = [
  // --- Common Dashboard ---
  {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    roles: ['farmer', 'expert', 'officer'],
    group: 'primary',
  },

  // --- Farmer Canonical Stages ---
  {
    id: 'farm',
    path: '/farm',
    label: 'My Farm',
    labelKey: 'nav.farm',
    icon: MapPin,
    roles: ['farmer'],
    group: 'workflow',
    stage: 0,
  },
  {
    id: 'disease',
    path: '/disease',
    label: 'Scan Leaf',
    labelKey: 'nav.disease',
    icon: ShieldAlert,
    roles: ['farmer'],
    group: 'workflow',
    stage: 1,
  },
  {
    id: 'pests',
    path: '/pests',
    label: 'Pest & Sensor',
    labelKey: 'nav.pests',
    icon: Bug,
    roles: ['farmer'],
    group: 'workflow',
    stage: 1,
  },
  {
    id: 'risk',
    path: '/risk',
    label: 'Risk Forecast',
    labelKey: 'nav.risk',
    icon: Activity,
    roles: ['farmer'],
    group: 'workflow',
    stage: 2,
  },
  {
    id: 'weather',
    path: '/weather',
    label: 'Weather',
    labelKey: 'nav.weather',
    icon: CloudSun,
    roles: ['farmer', 'expert', 'officer'],
    group: 'workflow',
  },
  {
    id: 'followups',
    path: '/followups',
    label: 'Follow-ups',
    labelKey: 'nav.followups',
    icon: CalendarCheck,
    roles: ['farmer'],
    group: 'workflow',
    stage: 7,
  },
  {
    id: 'referrals',
    path: '/referrals',
    label: 'Referrals',
    labelKey: 'nav.referrals',
    icon: Building2,
    roles: ['farmer', 'expert', 'officer'],
    group: 'workflow',
    stage: 6,
  },

  // --- Officer / Expert Specialized Views ---
  {
    id: 'regional-monitoring',
    path: '/regional-monitoring',
    label: 'Regional Monitoring',
    labelKey: 'nav.regional',
    icon: Activity,
    roles: ['officer'],
    group: 'workflow',
    stage: 9,
  },
  {
    id: 'expert',
    path: '/expert',
    label: 'Review Queue',
    labelKey: 'nav.expert',
    icon: UserCheck,
    roles: ['expert', 'officer'],
    group: 'workflow',
    stage: 5,
  },
  {
    id: 'hotspots',
    path: '/hotspots',
    label: 'Outbreak Hotspots',
    labelKey: 'nav.hotspots',
    icon: Flame,
    roles: ['expert', 'officer'],
    group: 'workflow',
    stage: 9,
  },
  {
    id: 'feedback',
    path: '/feedback',
    label: 'Feedback Dataset',
    labelKey: 'nav.feedback',
    icon: Database,
    roles: ['officer'],
    group: 'workflow',
    stage: 8,
  },

  // --- Farmer More Tools Group ---
  {
    id: 'irrigation',
    path: '/irrigation',
    label: 'Smart Irrigation',
    labelKey: 'nav.irrigation',
    icon: Droplets,
    roles: ['farmer'],
    group: 'more_tools',
  },
  {
    id: 'crop-recommendation',
    path: '/crop-recommendation',
    label: 'Crop Recommendation',
    labelKey: 'nav.crop',
    icon: Sprout,
    roles: ['farmer'],
    group: 'more_tools',
  },
  {
    id: 'sustainability',
    path: '/sustainability',
    label: 'Sustainability',
    labelKey: 'nav.sustainability',
    icon: Leaf,
    roles: ['farmer'],
    group: 'more_tools',
  },
  {
    id: 'assistant',
    path: '/assistant',
    label: 'AI Agronomist',
    labelKey: 'nav.assistant',
    icon: Bot,
    badge: 'Groq',
    roles: ['farmer'],
    group: 'more_tools',
  },
];

/**
 * Filter items by user role.
 * Empty roles list means accessible to all authenticated users.
 */
export const getNavItemsForRole = (role) => {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.length === 0 || item.roles.includes(role));
};

export default NAV_ITEMS;

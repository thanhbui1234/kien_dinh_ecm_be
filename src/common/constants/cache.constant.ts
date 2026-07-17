export const CACHE_TTL = {
  ONE_HOUR: 3600,
  TWELVE_HOURS: 43200,
  TWENTY_FOUR_HOURS: 86400, // 24 hours
  SEVEN_DAYS: 604800, // 7 days
};

export const CACHE_KEYS = {
  // --- ABOUT ---
  ABOUT: {
    COMPANY_INFO: 'about:company_info',
    FACILITIES: 'about:facilities',
  },

  // --- SETTINGS ---
  SETTINGS: {
    SYSTEM: 'system:settings',
    COMPANY_SLOGANS: 'system:company_slogans',
    COMPANY_TIMELINES: 'system:company_timelines',
    BANNERS: 'system:banners',
  },

  // --- CATEGORIES ---
  CATEGORIES: {
    FLAT: 'categories:flat',
  },

  // --- PRODUCTS ---
  PRODUCTS: {
    FEATURED_PREFIX: 'products:featured:*',
    GET_FEATURED: (skip: number, limit: number) =>
      `products:featured:${skip}:${limit}`,
    DETAIL: (idOrSlug: string) => `product:detail:${idOrSlug}`,
  },

  // --- PROJECTS ---
  PROJECTS: {
    RECENT_PREFIX: 'projects:recent:*',
    GET_RECENT: (skip: number, limit: number, status?: boolean) =>
      `projects:recent:${skip}:${limit}:${status ?? 'all'}`,
    DETAIL: (id: string) => `project:detail:${id}`,
  },

  // --- JOBS ---
  JOBS: {
    ACTIVE_LIST_PREFIX: 'jobs:list:active:*',
    GET_ACTIVE_LIST: (skip: number, limit: number) =>
      `jobs:list:active:${skip}:${limit}`,
  },
};

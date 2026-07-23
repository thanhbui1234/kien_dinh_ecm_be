export const CACHE_TTL = {
  ONE_HOUR: 3600,
  TWELVE_HOURS: 43200,
  TWENTY_FOUR_HOURS: 86400, // 24 hours
  SEVEN_DAYS: 604800, // 7 days
};

export const CACHE_KEYS = {
  // --- ABOUT ---
  ABOUT: {
    COMPANY_PROFILE: 'about:company_profile',
    COMPANY_INFO: 'about:company_info',
    FACILITIES: 'about:facilities',
    HISTORY_EVENTS: 'about:history_events',
  },

  // --- SETTINGS ---
  SETTINGS: {
    SYSTEM: 'system:settings',
    COMPANY_SLOGANS: 'system:company_slogans',
    BANNERS: 'system:banners',
  },

  // --- CATEGORIES ---
  CATEGORIES: {
    FLAT: 'categories:flat',
  },

  // --- PRODUCTS ---
  PRODUCTS: {
    LIST_PREFIX: 'products:list:*',
    GET_LIST: (filters: any) => {
      const sortedFilters = Object.keys(filters || {})
        .sort()
        .reduce((acc, key) => {
          if (filters[key] !== undefined) acc[key] = filters[key];
          return acc;
        }, {} as any);
      return `products:list:${JSON.stringify(sortedFilters)}`;
    },
    DETAIL: (idOrSlug: string) => `product:detail:${idOrSlug}`,
  },

  // --- PROJECTS ---
  PROJECTS: {
    LIST_PREFIX: 'projects:list:*',
    GET_LIST: (filters: any) => {
      const sortedFilters = Object.keys(filters || {})
        .sort()
        .reduce((acc, key) => {
          if (filters[key] !== undefined) acc[key] = filters[key];
          return acc;
        }, {} as any);
      return `projects:list:${JSON.stringify(sortedFilters)}`;
    },
    DETAIL: (id: string) => `project:detail:${id}`,
  },

  // --- JOBS ---
  JOBS: {
    LIST_PREFIX: 'jobs:list:*',
    GET_LIST: (filters: any) => {
      const sortedFilters = Object.keys(filters || {})
        .sort()
        .reduce((acc, key) => {
          if (filters[key] !== undefined) acc[key] = filters[key];
          return acc;
        }, {} as any);
      return `jobs:list:${JSON.stringify(sortedFilters)}`;
    },
    DETAIL: (idOrSlug: string) => `job:detail:${idOrSlug}`,
  },
};

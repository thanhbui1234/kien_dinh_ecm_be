export const CACHE_TTL = {
  ONE_HOUR: 3600,
  TWELVE_HOURS: 43200,
  TWENTY_FOUR_HOURS: 86400, // 24 hours
  SEVEN_DAYS: 604800, // 7 days
};

export const CACHE_KEYS = {
  // --- ABOUT ---
  ABOUT: {
    COMPANY_PROFILE: 'cache:about:company_profile',
    COMPANY_INFO: 'cache:about:company_info',
    FACILITIES: 'cache:about:facilities',
    HISTORY_EVENTS: 'cache:about:history_events',
    COMPANY_LOCATIONS: 'cache:about:company_locations',
  },

  // --- SETTINGS ---
  SETTINGS: {
    SYSTEM: 'cache:system:settings',
    COMPANY_SLOGANS: 'cache:system:company_slogans',
    BANNERS: 'cache:system:banners',
  },

  // --- CONTACT ---
  CONTACT: {
    SETTING: 'cache:contact:setting',
  },

  // --- FOOTER ---
  FOOTER: {
    SETTING: 'cache:footer:setting',
  },

  // --- CATEGORIES ---
  CATEGORIES: {
    LIST_PREFIX: 'cache:categories:*',
    FLAT: (lang: string = 'VI') => `cache:categories:flat:${lang}`,
    DETAIL: (idOrSlug: string, lang: string = 'VI') => `cache:category:detail:${lang}:${idOrSlug}`,
  },

  // --- PRODUCTS ---
  PRODUCTS: {
    LIST_PREFIX: 'cache:product*',
    GET_LIST: (filters: any, lang: string = 'VI') => {
      const sortedFilters = Object.keys(filters || {})
        .sort()
        .reduce((acc, key) => {
          if (filters[key] !== undefined) acc[key] = filters[key];
          return acc;
        }, {} as any);
      return `cache:products:list:${lang}:${JSON.stringify(sortedFilters)}`;
    },
    DETAIL: (idOrSlug: string, lang: string = 'VI') => `cache:product:detail:${lang}:${idOrSlug}`,
  },

  // --- PROJECTS ---
  PROJECTS: {
    LIST_PREFIX: 'cache:project*',
    GET_LIST: (filters: any, lang: string = 'VI') => {
      const sortedFilters = Object.keys(filters || {})
        .sort()
        .reduce((acc, key) => {
          if (filters[key] !== undefined) acc[key] = filters[key];
          return acc;
        }, {} as any);
      return `cache:projects:list:${lang}:${JSON.stringify(sortedFilters)}`;
    },
    DETAIL: (idOrSlug: string, lang: string = 'VI') => `cache:project:detail:${lang}:${idOrSlug}`,
  },

  // --- JOBS ---
  JOBS: {
    LIST_PREFIX: 'cache:job*',
    GET_LIST: (filters: any, lang: string = 'VI') => {
      const sortedFilters = Object.keys(filters || {})
        .sort()
        .reduce((acc, key) => {
          if (filters[key] !== undefined) acc[key] = filters[key];
          return acc;
        }, {} as any);
      return `cache:jobs:list:${lang}:${JSON.stringify(sortedFilters)}`;
    },
    DETAIL: (idOrSlug: string, lang: string = 'VI') => `cache:job:detail:${lang}:${idOrSlug}`,
  },
};

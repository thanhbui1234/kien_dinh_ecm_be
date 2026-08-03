export const CACHE_TTL = {
  ONE_HOUR: 3600,
  TWELVE_HOURS: 43200,
  TWENTY_FOUR_HOURS: 86400,
  SEVEN_DAYS: 604800,
};

export const CACHE_KEYS = {
  // --- ABOUT ---
  ABOUT: {
    COMPANY_PROFILE: (lang: string = 'VI') => `cache:about:company_profile:${lang}`,
    COMPANY_INFO: (lang: string = 'VI') => `cache:about:company_info:${lang}`,
    FACILITIES: (lang: string = 'VI') => `cache:about:facilities:${lang}`,
    HISTORY_EVENTS: (lang: string = 'VI') => `cache:about:history_events:${lang}`,
    COMPANY_LOCATIONS: (lang: string = 'VI') => `cache:about:company_locations:${lang}`,
    LIST_PREFIX: 'cache:about:*',
  },

  // --- SETTINGS ---
  SETTINGS: {
    SYSTEM: 'cache:system:settings',
    COMPANY_SLOGANS: (lang: string = 'VI') => `cache:system:company_slogans:${lang}`,
    BANNERS: (lang: string = 'VI') => `cache:system:banners:${lang}`,
    LIST_PREFIX: 'cache:system:company_slogans:*',
    BANNERS_PREFIX: 'cache:system:banners:*',
  },

  // --- CONTACT ---
  CONTACT: {
    SETTING: (lang: string = 'VI') => `cache:contact:setting:${lang}`,
    PREFIX: 'cache:contact:setting:*',
  },

  // --- FOOTER ---
  FOOTER: {
    SETTING: (lang: string = 'VI') => `cache:footer:setting:${lang}`,
    PREFIX: 'cache:footer:setting:*',
  },

  // --- CATEGORIES ---
  CATEGORIES: {
    LIST_PREFIX: 'cache:categories:*',
    FLAT: (lang: string = 'VI') => `cache:categories:flat:${lang}`,
    DETAIL: (idOrSlug: string, lang: string = 'VI') => `cache:categories:detail:${lang}:${idOrSlug}`,
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

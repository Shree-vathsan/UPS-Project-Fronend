// Central API configuration
// Change this URL to switch between local and production
export const API_CONFIG = {
    // Production (Cloud Run)
    // baseUrl: 'https://codefamily-backend-854884449726.us-central1.run.app',

    // Local development (uncomment to use local backend)
    baseUrl: 'http://localhost:5000',
} as const;

export const API_BASE_URL = API_CONFIG.baseUrl;

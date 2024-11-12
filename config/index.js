// Environment variable configuration with safe defaults
const ENV = {
  development: {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'default_dev_url',
    SUPABASE_ANON_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'default_dev_key',
    CLERK_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'default_dev_clerk_key',
  },
  production: {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
  },
};

export default {
  // Return development config in development mode
  ...(__DEV__ ? ENV.development : ENV.production),
  // Add any other configuration values
  APP_NAME: 'Shot Me',
  VERSION: '1.0.4',
};

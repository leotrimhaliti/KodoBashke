import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

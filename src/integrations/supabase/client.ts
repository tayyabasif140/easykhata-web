
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const SUPABASE_URL = "https://ykjtvqztcatrkinzfpov.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlranR2cXp0Y2F0cmtpbnpmcG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODM2NjIsImV4cCI6MjA1NTU1OTY2Mn0.g_AHL0PMZ0IoTucIJpFutzinqX6nYdoN6uXUlIubwgI";

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-app-version': '1.0.0',
    },
  },
});

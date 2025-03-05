
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ykjtvqztcatrkinzfpov.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlranR2cXp0Y2F0cmtpbnpmcG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODM2NjIsImV4cCI6MjA1NTU1OTY2Mn0.g_AHL0PMZ0IoTucIJpFutzinqX6nYdoN6uXUlIubwgI";

// Create Supabase client with improved session handling
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: async (url, options = {}) => {
      try {
        // Check if we need to refresh the session
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // If no session, attempt to refresh
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.warn("Session refresh failed:", error.message);
          }
        }
        return fetch(url, options);
      } catch (error) {
        console.error("Error in fetch interceptor:", error);
        return fetch(url, options);
      }
    }
  }
});

// Set up a listener for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token has been refreshed');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Optionally redirect to login page
    // window.location.href = '/auth';
  }
});

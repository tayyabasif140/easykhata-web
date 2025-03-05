
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ykjtvqztcatrkinzfpov.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlranR2cXp0Y2F0cmtpbnpmcG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODM2NjIsImV4cCI6MjA1NTU1OTY2Mn0.g_AHL0PMZ0IoTucIJpFutzinqX6nYdoN6uXUlIubwgI";

// Create Supabase client with improved session handling
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Improved token handling and refresh mechanism
let refreshPromise: Promise<any> | null = null;

// The old api.fetchWithAuth is no longer available in newer Supabase versions
// We'll use a more modern approach for token refresh

// Set up a listener for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token has been refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Optionally redirect to login page
    window.location.href = '/auth';
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in');
  }
});

// Add an interceptor to the global fetch for debugging auth issues
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [url, options] = args;
  
  // Only log auth-related requests
  if (typeof url === 'string' && url.includes('supabase') && url.includes('auth')) {
    console.log(`Auth request to: ${url}`);
    try {
      const response = await originalFetch(...args);
      
      // Clone the response to inspect it without consuming it
      const clonedResponse = response.clone();
      try {
        const data = await clonedResponse.json();
        if (!response.ok) {
          console.error('Auth request failed:', data);
        }
      } catch (e) {
        // If we can't parse as JSON, just log the status
        if (!response.ok) {
          console.error('Auth request failed with status:', response.status);
        }
      }
      
      return response;
    } catch (error) {
      console.error('Auth request error:', error);
      throw error;
    }
  }
  
  return originalFetch(...args);
};

// Add a function to check and refresh the session on demand
export const checkAndRefreshSession = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    
    if (!data.session) {
      console.log("No session found, attempting to refresh...");
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Failed to refresh session:", error.message);
        // If refresh fails, redirect to auth page
        window.location.href = '/auth';
        return false;
      }
      return true;
    }
    
    // Check if token is about to expire (within 5 minutes)
    if (data.session.expires_at && 
        new Date(data.session.expires_at * 1000).getTime() - Date.now() < 5 * 60 * 1000) {
      console.log("Token about to expire, refreshing...");
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error("Failed to refresh session:", error.message);
        return false;
      }
      return true;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking session:", error);
    return false;
  }
};

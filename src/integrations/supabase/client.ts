
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ykjtvqztcatrkinzfpov.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlranR2cXp0Y2F0cmtpbnpmcG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODM2NjIsImV4cCI6MjA1NTU1OTY2Mn0.g_AHL0PMZ0IoTucIJpFutzinqX6nYdoN6uXUlIubwgI";

// Create Supabase client with improved session handling
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'invoicing-app-auth-token', // Ensure a unique key to avoid conflicts
  }
});

// Set up a listener for auth state changes with improved error handling
supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Auth state changed: ${event}`);
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token has been refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Clear any cached data that might be causing issues
    localStorage.removeItem('invoicing-app-auth-token');
    sessionStorage.clear();
    // Redirect to login page
    window.location.href = '/auth';
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in successfully');
  } else if (event === 'USER_UPDATED') {
    console.log('User details updated');
  }
});

// Add an interceptor to the global fetch for better debugging of auth issues
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
          // If we get a 401 (expired token), try to force a refresh
          if (response.status === 401) {
            console.log('Token expired, attempting to refresh...');
            await supabase.auth.refreshSession();
          }
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

// Add a function to check and refresh the session on demand with improved error handling
export const checkAndRefreshSession = async () => {
  try {
    console.log('Checking current session status...');
    const { data, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session check error:', sessionError);
      return false;
    }
    
    if (!data.session) {
      console.log("No session found, attempting to refresh...");
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error("Failed to refresh session:", refreshError.message);
        // Force sign out if refresh fails to clear any invalid state
        await supabase.auth.signOut();
        window.location.href = '/auth';
        return false;
      }
      
      if (refreshData.session) {
        console.log("Session refreshed successfully");
        return true;
      }
      
      console.log("No session after refresh, redirecting to auth");
      window.location.href = '/auth';
      return false;
    }
    
    // Check if token is about to expire (within 10 minutes - increased from 5)
    const expiresAt = data.session.expires_at ? new Date(data.session.expires_at * 1000) : null;
    const now = new Date();
    
    if (expiresAt && expiresAt.getTime() - now.getTime() < 10 * 60 * 1000) {
      console.log("Token about to expire, refreshing...");
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error("Failed to refresh session:", refreshError.message);
        return false;
      }
      
      console.log("Proactive token refresh successful");
      return true;
    }
    
    console.log("Session is valid and not near expiration");
    return true;
  } catch (error) {
    console.error("Error checking session:", error);
    return false;
  }
};

// Force a session check on page load to ensure we have a valid token
window.addEventListener('load', () => {
  console.log('Page loaded, checking session validity');
  checkAndRefreshSession();
});

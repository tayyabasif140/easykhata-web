
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ykjtvqztcatrkinzfpov.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlranR2cXp0Y2F0cmtpbnpmcG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODM2NjIsImV4cCI6MjA1NTU1OTY2Mn0.g_AHL0PMZ0IoTucIJpFutzinqX6nYdoN6uXUlIubwgI";

// Improve client configuration for better performance
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'invoicing-app-auth-token',
  },
  global: {
    headers: {
      'Cache-Control': 'max-age=300', // Cache responses for 5 minutes when possible
    },
    fetch: async (url, options) => {
      // Use custom fetch implementation with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
      
      try {
        options.signal = controller.signal;
        const response = await fetch(url, options);
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  },
  // Set default fetch caching behavior
  realtime: {
    timeout: 10000, // Reduce realtime connection timeout to 10 seconds
  },
});

// Optimize auth state change handling
let authChangeProcessing = false;
const authChangeDebounceTime = 300;

supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Auth state changed: ${event}`);
  
  // Prevent multiple rapid auth state changes from causing UI flickering
  if (authChangeProcessing) {
    console.log('Auth change already processing, skipping');
    return;
  }
  
  authChangeProcessing = true;
  
  setTimeout(() => {
    authChangeProcessing = false;
  }, authChangeDebounceTime);
  
  if (event === 'TOKEN_REFRESHED') {
    console.log('Token has been refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Clear any cached data that might be causing issues
    localStorage.removeItem('invoicing-app-auth-token');
    sessionStorage.clear();
    
    // Use setTimeout to prevent immediate redirects that cause flickering
    setTimeout(() => {
      // Only redirect if we're not already on the auth page
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
    }, 100);
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in successfully');
    
    // Add delay before redirect to prevent flickering
    setTimeout(() => {
      // Only redirect if we're on the auth page
      if (window.location.pathname.includes('/auth')) {
        window.location.href = '/';
      }
    }, 100);
  } else if (event === 'USER_UPDATED') {
    console.log('User details updated');
  }
});

// Helper function to get a public URL for an avatar or image
export const getPublicImageUrl = (path: string) => {
  if (!path) return null;
  
  const { data } = supabase.storage
    .from('business_files')
    .getPublicUrl(path);
    
  return data.publicUrl;
};

// Optimize session checking with caching
let cachedSessionPromise = null;
let lastSessionCheck = 0;
const sessionCacheTime = 60000; // 1 minute cache

export const checkAndRefreshSession = async () => {
  const now = Date.now();
  
  // Use cached result if available and not expired
  if (cachedSessionPromise && (now - lastSessionCheck < sessionCacheTime)) {
    return cachedSessionPromise;
  }
  
  console.log('Checking current session status...');
  lastSessionCheck = now;
  
  // Create new promise and cache it
  cachedSessionPromise = (async () => {
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session check error:', sessionError);
        return false;
      }
      
      if (!data.session) {
        console.log("No session found, attempting to refresh...");
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error("Failed to refresh session:", refreshError.message);
            return false;
          }
          
          if (refreshData.session) {
            console.log("Session refreshed successfully");
            return true;
          }
          
          return false;
        } catch (err) {
          console.error("Failed to refresh session:", err);
          return false;
        }
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
  })();
  
  return cachedSessionPromise;
};

// Define proper types for the fetch cache options
interface FetchCacheOptions {
  useCachedData?: boolean;
  maxAge?: number;
  cacheResults?: boolean;
}

// Implement optimized data fetching helper with proper type definitions
export const fetchWithCache = async (tableName: string, query: any, options: FetchCacheOptions = {}) => {
  const cacheKey = `supabase-cache-${tableName}-${JSON.stringify(query)}`;
  const cachedData = sessionStorage.getItem(cacheKey);
  
  // Use cached data if available and not expired
  if (cachedData && options.useCachedData !== false) {
    try {
      const { data, timestamp } = JSON.parse(cachedData);
      const now = Date.now();
      const maxAge = options.maxAge || 60000; // Default 1 minute cache
      
      if (now - timestamp < maxAge) {
        console.log(`Using cached data for ${tableName}`);
        return { data, source: 'cache' };
      }
    } catch (e) {
      console.error('Cache parsing error:', e);
    }
  }
  
  // Fetch fresh data
  const result = await query;
  
  // Cache the fresh data if no error
  if (!result.error && result.data && options.cacheResults !== false) {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: result.data,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Cache storage error:', e);
    }
  }
  
  return { ...result, source: 'network' };
};

// Add selective revalidation function
export const invalidateCache = (pattern) => {
  try {
    // Remove matching items from sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('supabase-cache-') && (
        !pattern || key.includes(pattern)
      )) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.error('Cache invalidation error:', e);
  }
};

// Force a session check on page load to ensure we have a valid token
window.addEventListener('load', () => {
  console.log('Page loaded, checking session validity');
  checkAndRefreshSession();
});

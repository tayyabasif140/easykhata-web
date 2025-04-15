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
      'Cache-Control': 'max-age=0, no-cache', // Prevent caching for better image upload/view
    },
    fetch: async (url, options) => {
      // Use custom fetch implementation with timeout and retry
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout (increased)
      
      const maxRetries = 2;
      let retryCount = 0;
      let lastError = null;
      
      while (retryCount <= maxRetries) {
        try {
          options.signal = controller.signal;
          const response = await fetch(url, options);
          return response;
        } catch (error) {
          lastError = error;
          retryCount++;
          
          if (retryCount <= maxRetries) {
            console.log(`Fetch attempt ${retryCount} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }
      
      throw lastError;
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
    
    // Force a bucket check when signing in
    ensureBusinessFilesBucket();
  } else if (event === 'USER_UPDATED') {
    console.log('User details updated');
  }
});

// Helper function to get a public URL for an avatar or image
export const getPublicImageUrl = (path: string) => {
  if (!path) return null;
  
  // Check if the path is already a full URL (including Google profile URLs)
  if (path.startsWith('http')) return path;
  
  try {
    // Get the public URL for the image
    const { data } = supabase.storage
      .from('business_files')
      .getPublicUrl(path);
      
    console.log("Generated public URL:", data?.publicUrl);
    
    // Add a cache-busting parameter to prevent stale images
    const timestamp = Date.now();
    const url = data?.publicUrl ? `${data.publicUrl}?t=${timestamp}` : null;
    
    return url;
  } catch (error) {
    console.error("Error generating public URL:", error);
    return null;
  }
};

// Check if business_files bucket exists and make it public if not
export const ensureBusinessFilesBucket = async () => {
  try {
    console.log("Checking if business_files bucket exists and is public");
    let bucketCreated = false;
    
    // First check if we have an active session
    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = !!sessionData?.session;
    
    if (!hasSession) {
      console.log("No active session, skipping bucket check");
      return false;
    }
    
    // Try first to list buckets
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("Error checking buckets:", error);
      } else {
        const businessFilesBucket = buckets.find(bucket => bucket.name === 'business_files');
        
        if (!businessFilesBucket) {
          console.log("business_files bucket doesn't exist, attempting to create it");
        } else if (!businessFilesBucket.public) {
          console.error("business_files bucket exists but is not public - images won't be accessible");
          console.log("Attempting to update bucket to be public");
          
          const { error: updateError } = await supabase.storage.updateBucket('business_files', {
            public: true
          });
          
          if (updateError) {
            console.error("Error updating business_files bucket to public:", updateError);
          } else {
            console.log("business_files bucket updated to be public");
            return true;
          }
        } else {
          console.log("business_files bucket is correctly configured as public");
          return true;
        }
      }
    } catch (err) {
      console.error("Error listing buckets:", err);
    }
    
    // If bucket doesn't exist or we couldn't list buckets due to permissions, try to create it
    if (!bucketCreated) {
      try {
        console.log("Creating business_files bucket...");
        const { data, error: createError } = await supabase.storage.createBucket('business_files', {
          public: true,
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          // Check if the error is because the bucket already exists
          if (createError.message.includes("already exists")) {
            console.log("Bucket exists, trying to update it to be public");
            try {
              const { error: updateError } = await supabase.storage.updateBucket('business_files', {
                public: true
              });
              
              if (updateError) {
                console.error("Error updating business_files bucket:", updateError);
              } else {
                console.log("business_files bucket updated to be public");
                return true;
              }
            } catch (updateErr) {
              console.error("Error updating bucket:", updateErr);
            }
          } else {
            console.error("Error creating business_files bucket:", createError);
          }
          
          // Try a direct upload to see if the bucket exists but is restricted
          console.log("Trying direct upload to check if bucket exists...");
          const testBlob = new Blob(["test"]);
          const { error: uploadError } = await supabase.storage
            .from("business_files")
            .upload("test.txt", testBlob, {
              upsert: true
            });
            
          if (uploadError) {
            if (uploadError.message.includes("does not exist")) {
              console.error("business_files bucket doesn't exist and cannot be created!");
              return false;
            } else if (uploadError.message.includes("row-level security")) {
              console.log("Bucket exists but RLS is preventing changes. Needs admin intervention.");
              return false;
            } else {
              console.log("Unknown error when testing bucket:", uploadError);
              return false;
            }
          } else {
            console.log("Test upload successful, bucket exists and is working");
            return true;
          }
        } else {
          console.log("business_files bucket created successfully and set to public");
          return true;
        }
      } catch (err) {
        console.error("Error in bucket creation:", err);
        return false;
      }
    }
    
    return false;
  } catch (err) {
    console.error("Error in bucket check:", err);
    return false;
  }
};

// Add event listener for image updates
window.addEventListener('profile-image-updated', () => {
  console.log('Profile image updated, refreshing...');
  
  // Force a reload of image caches by adding a timestamp
  const timestamp = new Date().getTime();
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    const src = img.getAttribute('src');
    if (src && src.includes('business_files')) {
      // Check if the URL already has a timestamp parameter
      const newSrc = src.includes('?') 
        ? `${src.split('?')[0]}?t=${timestamp}`
        : `${src}?t=${timestamp}`;
      
      img.setAttribute('src', newSrc);
      console.log(`Refreshed image src: ${newSrc}`);
    }
  });
  
  // Clear any cached image data
  invalidateCache('avatar');
  invalidateCache('logo');
});

// Run the check and setup when the client is initialized
ensureBusinessFilesBucket().then(success => {
  if (success) {
    console.log("Storage bucket setup completed successfully");
  } else {
    console.warn("Storage bucket setup could not be completed automatically");
  }
});

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
  
  // Also check the bucket exists on page load
  ensureBusinessFilesBucket();
});

// Try to create the bucket again after a delay if it failed initially
setTimeout(() => {
  ensureBusinessFilesBucket();
}, 5000);

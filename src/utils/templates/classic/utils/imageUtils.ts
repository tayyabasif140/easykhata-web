/**
 * Validates if a URL can be loaded as an image
 */
export const validateImageUrl = async (url: string): Promise<boolean> => {
  console.log("Validating image URL:", url);
  
  if (!url) {
    console.error("Empty URL provided for validation");
    return false;
  }
  
  try {
    // For Supabase URLs, direct validation is more reliable than HEAD requests
    if (url.includes('supabase') && url.includes('storage')) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          console.log("Image loaded successfully via Image object:", url);
          resolve(true);
        };
        img.onerror = (err) => {
          console.error("Image failed to load via Image object:", url, err);
          resolve(false);
        };
        img.src = url;
      });
    }
    
    // For other URLs, try HEAD request first
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`Image URL HEAD request failed with status: ${response.status}`);
      
      // Fallback to loading the image directly
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          console.log("Image loaded successfully via fallback");
          resolve(true);
        };
        img.onerror = () => {
          console.error("Image failed to load via fallback");
          resolve(false);
        };
        img.src = url;
      });
    }
    
    const contentType = response.headers.get('content-type');
    const isImage = contentType && contentType.startsWith('image/');
    
    if (!isImage) {
      console.error(`Invalid content type: ${contentType}`);
    }
    
    return isImage;
  } catch (error) {
    console.error("Error validating image URL:", error);
    
    // As a fallback, try to load the image directly
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log("Image loaded successfully via Image object");
        resolve(true);
      };
      img.onerror = () => {
        console.error("Image failed to load via Image object");
        resolve(false);
      };
      img.src = url;
    });
  }
};

/**
 * Creates a placeholder image data URL
 */
export const createPlaceholderImage = (text: string, size = 100): string => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Draw background
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, size, size);
  
  // Draw text
  ctx.fillStyle = '#64748b';
  ctx.font = `${size * 0.4}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.charAt(0).toUpperCase(), size / 2, size / 2);
  
  return canvas.toDataURL('image/png');
};

/**
 * Fetches an image and converts it to base64
 */
export const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  console.log("Fetching image as base64 from:", url);
  
  if (!url) {
    console.error("Empty URL provided for base64 conversion");
    return null;
  }
  
  try {
    // Handle URLs from Supabase storage by adding the complete URL if needed
    let fullUrl = url;
    if (!url.startsWith('http') && !url.startsWith('data:')) {
      fullUrl = `https://ykjtvqztcatrkinzfpov.supabase.co/storage/v1/object/public/business_files/${url}`;
      console.log("Using full URL:", fullUrl);
    }
    
    // Fetch the image
    const response = await fetch(fullUrl, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) {
      console.error(`Image fetch failed with status: ${response.status}`);
      return null;
    }
    
    // Get the blob from the response
    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        console.log("Base64 conversion successful, length:", base64data.length);
        resolve(base64data);
      };
      reader.onerror = () => {
        console.error("Error reading blob as data URL");
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error fetching image as base64:", error);
    return null;
  }
};

/**
 * Convert a File to a public URL by uploading to Supabase
 */
export const uploadImageAndGetPublicUrl = async (file: File, userId: string, type: 'avatar' | 'logo' = 'avatar'): Promise<string | null> => {
  console.log(`Starting upload of ${type} image:`, file.name, file.type, file.size);
  
  try {
    // Import supabase from the client file to use the existing session
    const { supabase } = await import('@/integrations/supabase/client');
    
    if (!userId) {
      console.error("User ID is required for image upload");
      return null;
    }
    
    // Get user session to ensure we're authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session found. User must be logged in to upload files.");
      return null;
    }
    
    // Validate file type
    const ALLOWED_FILE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      console.error("Invalid file type. Please upload PNG or JPG images only.");
      return null;
    }
    
    // Validate file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      console.error("File size should be less than 5MB.");
      return null;
    }
    
    // Create path and filename - use timestamp to prevent caching issues
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${timestamp}.${fileExt}`;
    const filePath = `${userId}/${type}/${fileName}`;
    
    console.log(`Uploading ${type} to path:`, filePath);
    
    // Ensure business_files bucket exists and is public
    await ensureBusinessFilesBucket(supabase);
    
    // Upload the file with multiple retries
    let uploadAttempt = 0;
    const maxAttempts = 3;
    let uploadError = null;
    let data = null;
    
    while (uploadAttempt < maxAttempts) {
      try {
        console.log(`Upload attempt ${uploadAttempt + 1}/${maxAttempts}`);
        const result = await supabase.storage
          .from("business_files")
          .upload(filePath, file, {
            cacheControl: "0", // No caching
            upsert: true // Overwrite if exists
          });
          
        if (result.error) {
          console.error(`Error on attempt ${uploadAttempt + 1}:`, result.error);
          uploadError = result.error;
          uploadAttempt++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        } else {
          data = result.data;
          uploadError = null;
          break; // Success, exit loop
        }
      } catch (err) {
        console.error(`Error on attempt ${uploadAttempt + 1}:`, err);
        uploadError = err;
        uploadAttempt++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
    
    if (uploadError || !data) {
      console.error("All upload attempts failed:", uploadError);
      return null;
    }
    
    console.log("File uploaded successfully, path:", data.path);
    
    // Return the file path
    return data.path;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};

// Ensure business_files bucket exists and is public
async function ensureBusinessFilesBucket(supabase) {
  try {
    console.log("Checking if business_files bucket exists and is public");
    
    // Try first to list buckets
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("Error checking buckets:", error);
      } else {
        const businessFilesBucket = buckets.find(bucket => bucket.name === 'business_files');
        
        if (!businessFilesBucket) {
          console.log("business_files bucket doesn't exist, creating it");
          const { error: createError } = await supabase.storage.createBucket('business_files', {
            public: true,
            fileSizeLimit: 5242880 // 5MB
          });
          
          if (createError) {
            console.error("Error creating business_files bucket:", createError);
            return false;
          }
          
          console.log("business_files bucket created successfully");
          return true;
        } else if (!businessFilesBucket.public) {
          console.error("business_files bucket exists but is not public - trying to update");
          
          try {
            const { error: updateError } = await supabase.storage.updateBucket('business_files', {
              public: true
            });
            
            if (updateError) {
              console.error("Error updating business_files bucket to public:", updateError);
              return false;
            }
            
            console.log("business_files bucket updated to be public");
            return true;
          } catch (e) {
            console.error("Error updating bucket visibility:", e);
            return false;
          }
        } else {
          console.log("business_files bucket is correctly configured as public");
          return true;
        }
      }
    } catch (err) {
      console.error("Error listing buckets:", err);
    }
    
    // If we couldn't determine bucket status, try to create it anyway
    try {
      console.log("Attempting to create or update business_files bucket");
      const { error: createError } = await supabase.storage.createBucket('business_files', {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        if (createError.message.includes("already exists")) {
          console.log("Bucket already exists, trying to update it");
          const { error: updateError } = await supabase.storage.updateBucket('business_files', {
            public: true
          });
          
          if (updateError) {
            console.error("Error updating business_files bucket:", updateError);
            return false;
          }
          
          console.log("business_files bucket updated successfully");
          return true;
        } else {
          console.error("Error creating business_files bucket:", createError);
          return false;
        }
      } else {
        console.log("business_files bucket created successfully");
        return true;
      }
    } catch (err) {
      console.error("Error creating/updating bucket:", err);
      return false;
    }
    
    return false;
  } catch (err) {
    console.error("Error in bucket management:", err);
    return false;
  }
}

/**
 * Directly handle image file upload from input or drop events
 */
export const handleImageFileUpload = async (file: File, userId: string, type: 'avatar' | 'logo' = 'avatar'): Promise<{ path: string, publicUrl: string } | null> => {
  try {
    console.log(`Processing ${type} upload for user ${userId}`);
    
    if (!userId) {
      console.error("No user ID provided for upload");
      return null;
    }
    
    // Import supabase from the client file to use the existing session
    const { supabase } = await import('@/integrations/supabase/client');
    
    // First check if we have an active session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      console.error("No active session, cannot upload image");
      return null;
    }
    
    const filePath = await uploadImageAndGetPublicUrl(file, userId, type);
    
    if (!filePath) {
      console.error("Failed to upload image");
      return null;
    }
    
    // Get the public URL using the path
    const { data: publicUrlData } = supabase.storage
      .from("business_files")
      .getPublicUrl(filePath);
    
    // Add a timestamp to prevent caching
    const timestamp = Date.now();
    const publicUrl = `${publicUrlData.publicUrl}?t=${timestamp}`;
    console.log("Generated public URL with cache busting:", publicUrl);
    
    // Update both profile and business details with the new image path
    try {
      if (type === 'avatar') {
        await supabase
          .from('profiles')
          .update({ 
            avatar_url: filePath,
            updated_at: new Date()
          })
          .eq('id', userId);
        
        // Also update business_logo_url to use the same image
        await supabase
          .from('business_details')
          .update({ 
            business_logo_url: filePath
          })
          .eq('user_id', userId);
        
        console.log("Updated both profile avatar and business logo");
      } else if (type === 'logo') {
        await supabase
          .from('business_details')
          .update({ 
            business_logo_url: filePath
          })
          .eq('user_id', userId);
        
        console.log("Updated business logo");
      }
    } catch (updateError) {
      console.error("Error updating database with new image path:", updateError);
      // Continue anyway since the file was uploaded successfully
    }
    
    return {
      path: filePath,
      publicUrl
    };
  } catch (error) {
    console.error("Error in handleImageFileUpload:", error);
    return null;
  }
};

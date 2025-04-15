
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
      fullUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://ykjtvqztcatrkinzfpov.supabase.co"}/storage/v1/object/public/business_files/${url}`;
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
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ykjtvqztcatrkinzfpov.supabase.co";
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlranR2cXp0Y2F0cmtpbnpmcG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODM2NjIsImV4cCI6MjA1NTU1OTY2Mn0.g_AHL0PMZ0IoTucIJpFutzinqX6nYdoN6uXUlIubwgI";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase credentials not found");
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
    
    // Ensure storage bucket exists
    let bucketExists = false;
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      bucketExists = buckets?.some(bucket => bucket.name === 'business_files') || false;
      console.log("Does business_files bucket exist?", bucketExists);
    } catch (error) {
      console.error("Error checking if bucket exists:", error);
    }
    
    if (!bucketExists) {
      try {
        console.log("Creating business_files bucket...");
        await supabase.storage.createBucket('business_files', { 
          public: true,
          fileSizeLimit: 5242880 
        });
        console.log("business_files bucket created successfully");
      } catch (error) {
        console.error("Error creating business_files bucket:", error);
        
        // If we can't create the bucket, we'll check if the bucket already exists
        // but the listBuckets() failed to find it due to permissions
        const { error: uploadError } = await supabase.storage
          .from("business_files")
          .upload("test.txt", new Blob(["test"]), {
            upsert: true
          });
          
        if (uploadError) {
          console.error("Unable to upload to business_files bucket:", uploadError);
          return null;
        } else {
          console.log("Bucket exists but couldn't list it. Proceeding with upload.");
        }
      }
    }
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from("business_files")
      .upload(filePath, file, {
        cacheControl: "0", // No caching
        upsert: true // Overwrite if exists
      });
      
    if (error) {
      console.error("Error uploading file:", error);
      return null;
    }
    
    console.log("File uploaded successfully, path:", data.path);
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from("business_files")
      .getPublicUrl(data.path);
      
    console.log(`File uploaded, public URL: ${publicUrlData.publicUrl}`);
    
    // Verify the image can be accessed
    const isValidImage = await validateImageUrl(publicUrlData.publicUrl);
    if (!isValidImage) {
      console.log("Uploaded image validation failed, trying to make the bucket public...");
      
      try {
        await supabase.storage.updateBucket('business_files', { public: true });
        console.log("Updated business_files bucket to be public");
      } catch (updateError) {
        console.error("Error updating bucket visibility:", updateError);
      }
    }
    
    return data.path;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};

/**
 * Directly handle image file upload from input or drop events
 */
export const handleImageFileUpload = async (file: File, userId: string, type: 'avatar' | 'logo' = 'avatar'): Promise<{ path: string, publicUrl: string } | null> => {
  try {
    console.log(`Processing ${type} upload for user ${userId}`);
    
    const filePath = await uploadImageAndGetPublicUrl(file, userId, type);
    
    if (!filePath) {
      console.error("Failed to upload image");
      return null;
    }
    
    // Get the public URL using the path
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ykjtvqztcatrkinzfpov.supabase.co";
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlranR2cXp0Y2F0cmtpbnpmcG92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODM2NjIsImV4cCI6MjA1NTU1OTY2Mn0.g_AHL0PMZ0IoTucIJpFutzinqX6nYdoN6uXUlIubwgI";
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: publicUrlData } = supabase.storage
      .from("business_files")
      .getPublicUrl(filePath);
    
    console.log("Generated public URL:", publicUrlData.publicUrl);
    
    // Update both profile and business details with the new image path
    // This improves the user experience since one upload updates both
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
    
    return {
      path: filePath,
      publicUrl: publicUrlData.publicUrl
    };
  } catch (error) {
    console.error("Error in handleImageFileUpload:", error);
    return null;
  }
};

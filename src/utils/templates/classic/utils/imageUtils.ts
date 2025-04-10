
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
    // Try to fetch the image headers first
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      console.error(`Image URL HEAD request failed with status: ${response.status}`);
      return false;
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.error(`Invalid content type: ${contentType}`);
      return false;
    }
    
    return true;
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
      fullUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${url}`;
      console.log("Using full URL:", fullUrl);
    }
    
    // Fetch the image
    const response = await fetch(fullUrl);
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
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
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
    
    // Create path and filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${type}/${fileName}`;
    
    console.log(`Uploading ${type} to path:`, filePath);
    
    // Ensure bucket exists and is public
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const businessFilesBucket = buckets?.find(bucket => bucket.name === 'business_files');
      
      if (!businessFilesBucket) {
        await supabase.storage.createBucket('business_files', { public: true });
        console.log("business_files bucket created successfully");
      } else if (!businessFilesBucket.public) {
        await supabase.storage.updateBucket('business_files', { public: true });
        console.log("Made business_files bucket public");
      }
    } catch (error) {
      console.error("Error handling bucket:", error);
    }
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from("business_files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true
      });
      
    if (error) {
      console.error("Error uploading file:", error);
      return null;
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from("business_files")
      .getPublicUrl(data.path);
      
    console.log(`File uploaded, public URL: ${publicUrlData.publicUrl}`);
    
    return filePath; // Return the path, not the full URL
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
    const filePath = await uploadImageAndGetPublicUrl(file, userId, type);
    
    if (!filePath) {
      return null;
    }
    
    // Get the public URL using the path
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: publicUrlData } = supabase.storage
      .from("business_files")
      .getPublicUrl(filePath);
    
    // Update the appropriate table based on the image type
    if (type === 'avatar') {
      await supabase
        .from('profiles')
        .update({ 
          avatar_url: filePath,
          updated_at: new Date()
        })
        .eq('id', userId);
    } else if (type === 'logo') {
      await supabase
        .from('business_details')
        .update({ 
          business_logo_url: filePath
        })
        .eq('user_id', userId);
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

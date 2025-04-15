
/**
 * Image validation utilities
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


import { getPublicImageUrl } from "@/integrations/supabase/client";

/**
 * Fetches an image from a URL and converts it to a base64 string
 * @param imagePath The path to the image in Supabase storage or a full URL
 * @returns Promise with base64 string or null if failed
 */
export const fetchImageAsBase64 = async (imagePath: string): Promise<string | null> => {
  try {
    if (!imagePath) {
      console.log("No image path provided");
      return null;
    }
    
    // Use the path directly if it's already a full URL, otherwise get the public URL
    const publicUrl = imagePath.startsWith('http') ? imagePath : getPublicImageUrl(imagePath);
    
    if (!publicUrl) {
      console.log("Could not generate public URL for path:", imagePath);
      return null;
    }
    
    console.log("Attempting to fetch image from:", publicUrl);
    
    // Fetch the image with no cache to ensure fresh content
    const response = await fetch(publicUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch image from ${publicUrl}. Status: ${response.status}`);
      return null;
    }
    
    // Convert to blob and then to base64
    const blob = await response.blob();
    console.log("Image fetched successfully, size:", blob.size, "bytes");
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        console.log("Image converted to base64, length:", base64String.length);
        resolve(base64String); // Return the full data URL including the MIME type prefix
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
};

/**
 * Validates if an image URL is accessible and can be loaded
 * @param imageUrl The URL of the image to validate
 * @returns Promise with boolean indicating if the image is valid
 */
export const validateImageUrl = async (imageUrl: string): Promise<boolean> => {
  if (!imageUrl) return false;
  
  try {
    const response = await fetch(imageUrl, { 
      method: 'HEAD',
      cache: 'no-store'
    });
    
    return response.ok && response.headers.get('content-type')?.startsWith('image/');
  } catch (error) {
    console.error("Error validating image URL:", error);
    return false;
  }
};

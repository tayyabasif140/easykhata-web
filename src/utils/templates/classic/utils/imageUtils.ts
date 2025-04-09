
import { getPublicImageUrl } from "@/integrations/supabase/client";

/**
 * Fetches an image from a URL and converts it to a base64 string
 * @param imagePath The path to the image in Supabase storage
 * @returns Promise with base64 string or null if failed
 */
export const fetchImageAsBase64 = async (imagePath: string): Promise<string | null> => {
  try {
    if (!imagePath) {
      console.log("No image path provided");
      return null;
    }
    
    // Get the public URL for the image
    const publicUrl = getPublicImageUrl(imagePath);
    if (!publicUrl) {
      console.log("Could not generate public URL for path:", imagePath);
      return null;
    }
    
    console.log("Attempting to fetch image from:", publicUrl);
    
    // Fetch the image
    const response = await fetch(publicUrl, {
      cache: 'no-store',  // Prevent caching issues
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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

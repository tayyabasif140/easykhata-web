
import { getPublicImageUrl } from "@/integrations/supabase/client";

/**
 * Fetches an image from a URL and converts it to a base64 string
 * @param imagePath The path to the image in Supabase storage
 * @returns Promise with base64 string or null if failed
 */
export const fetchImageAsBase64 = async (imagePath: string): Promise<string | null> => {
  try {
    if (!imagePath) return null;
    
    // Get the public URL for the image
    const publicUrl = getPublicImageUrl(imagePath);
    if (!publicUrl) return null;
    
    // Fetch the image
    const response = await fetch(publicUrl);
    if (!response.ok) {
      console.error(`Failed to fetch image from ${publicUrl}. Status: ${response.status}`);
      return null;
    }
    
    // Convert to blob and then to base64
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String); // Return the full data URL including the MIME type prefix
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
};


/**
 * Image conversion utilities
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

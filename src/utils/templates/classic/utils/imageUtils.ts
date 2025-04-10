
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

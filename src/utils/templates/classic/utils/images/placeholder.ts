
/**
 * Placeholder image creation utilities
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

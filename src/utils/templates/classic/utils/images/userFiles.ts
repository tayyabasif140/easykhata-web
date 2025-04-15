
/**
 * User-facing image file handling utilities
 */
import { uploadImageAndGetPublicUrl } from './storage';

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

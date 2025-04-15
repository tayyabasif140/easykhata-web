
import { TemplateProps } from '../../invoiceTemplates';
import { createClassicPDF } from './createClassicPDF';
import { fetchImageAsBase64 } from './utils/images/conversion';
import { supabase } from '@/integrations/supabase/client';

// Check if business_files bucket exists and is public
const checkBusinessFilesBucket = async () => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error checking buckets:", error);
      return;
    }
    
    const businessFilesBucket = buckets.find(bucket => bucket.name === 'business_files');
    
    if (!businessFilesBucket) {
      console.error("business_files bucket doesn't exist!");
      return;
    }
    
    if (!businessFilesBucket.public) {
      console.error("business_files bucket exists but is not public - images won't be accessible");
    } else {
      console.log("business_files bucket is correctly configured as public");
    }
  } catch (err) {
    console.error("Error in bucket check:", err);
  }
};

// Run the check when this module is imported
checkBusinessFilesBucket();

export const classicTemplate = async (props: TemplateProps) => {
  const { businessDetails, profile } = props;
  
  // Preload images as base64 if available
  let signatureBase64 = null;
  let logoBase64 = null;
  
  try {
    // Try to fetch signature if available
    if (profile?.digital_signature_url) {
      console.log("Attempting to load signature from:", profile.digital_signature_url);
      signatureBase64 = await fetchImageAsBase64(profile.digital_signature_url);
      console.log("Signature loaded successfully:", signatureBase64 ? "Yes" : "No");
    } else {
      console.log("No signature URL available");
    }
    
    // Try to fetch logo if available
    if (businessDetails?.business_logo_url) {
      console.log("Attempting to load logo from:", businessDetails.business_logo_url);
      logoBase64 = await fetchImageAsBase64(businessDetails.business_logo_url);
      console.log("Logo loaded successfully:", logoBase64 ? "Yes" : "No");
    } else {
      console.log("No logo URL available");
    }
  } catch (error) {
    console.error("Error pre-loading images:", error);
  }
  
  // Add the base64 images to the props
  const enhancedProps = {
    ...props,
    signatureBase64,
    logoBase64
  };
  
  // Now call the async createClassicPDF function with await
  return await createClassicPDF(enhancedProps);
};

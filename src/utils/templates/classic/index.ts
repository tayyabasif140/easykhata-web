
import { TemplateProps } from '../../invoiceTemplates';
import { createClassicPDF } from './createClassicPDF';
import { fetchImageAsBase64 } from './utils/images/conversion';

export const classicTemplate = async (props: TemplateProps) => {
  const { businessDetails, profile } = props;
  
  // Preload images as base64 if available
  let signatureBase64 = null;
  let logoBase64 = null;
  
  try {
    // Try to fetch signature if available
    if (profile?.digital_signature_url) {
      console.log("Attempting to load signature from:", profile.digital_signature_url);
      
      let signatureUrl = profile.digital_signature_url;
      
      if (!signatureUrl.startsWith('http') && !signatureUrl.startsWith('data:')) {
        const supabaseUrl = 'https://ykjtvqztcatrkinzfpov.supabase.co';
        signatureUrl = `${supabaseUrl}/storage/v1/object/public/business_files/${signatureUrl}`;
      }
      
      signatureBase64 = await fetchImageAsBase64(signatureUrl);
      console.log("Signature loaded successfully:", signatureBase64 ? "Yes" : "No");
    } else {
      console.log("No signature URL available");
    }
    
    // Try to fetch logo if available
    if (businessDetails?.business_logo_url) {
      console.log("Attempting to load logo from:", businessDetails.business_logo_url);
      
      let logoUrl = businessDetails.business_logo_url;
      
      if (!logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
        const supabaseUrl = 'https://ykjtvqztcatrkinzfpov.supabase.co';
        logoUrl = `${supabaseUrl}/storage/v1/object/public/business_files/${logoUrl}`;
      }
      
      logoBase64 = await fetchImageAsBase64(logoUrl);
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

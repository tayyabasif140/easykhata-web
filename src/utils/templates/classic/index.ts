
import { TemplateProps } from '../../invoiceTemplates';
import { createClassicPDF } from './createClassicPDF';
import { fetchImageAsBase64 } from './utils/imageUtils';

export const classicTemplate = async (props: TemplateProps) => {
  const { businessDetails, profile } = props;
  
  // Preload images as base64 if available
  let signatureBase64 = null;
  let logoBase64 = null;
  
  try {
    // Try to fetch signature if available
    if (profile?.digital_signature_url) {
      signatureBase64 = await fetchImageAsBase64(profile.digital_signature_url);
    }
    
    // Try to fetch logo if available
    if (businessDetails?.business_logo) {
      logoBase64 = await fetchImageAsBase64(businessDetails.business_logo);
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
  
  return createClassicPDF(enhancedProps);
};

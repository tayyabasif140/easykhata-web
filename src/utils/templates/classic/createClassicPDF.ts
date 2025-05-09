
import jsPDF from 'jspdf';
import { TemplateProps } from '../../invoiceTemplates';
import { renderHeader } from './sections/header';
import { renderCustomerInfo } from './sections/customerInfo';
import { renderProductsTable } from './sections/productsTable';
import { renderTotals } from './sections/totals';
import { renderFooter } from './sections/footer';
import { handleError } from './utils/errorHandler';
import { fetchImageAsBase64 } from './utils/images/conversion';

export const createClassicPDF = async (props: TemplateProps): Promise<jsPDF> => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  try {
    // Prepare logo and signature if available
    let preparedProps = { ...props };
    
    // Fetch logo if available
    if (props.businessDetails?.business_logo_url && !props.logoBase64) {
      try {
        console.log("Fetching logo for PDF from URL:", props.businessDetails.business_logo_url);
        let logoUrl = props.businessDetails.business_logo_url;
        
        if (!logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
          logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${logoUrl}`;
        }
        
        const timestamp = Date.now();
        logoUrl = logoUrl.includes('?') ? `${logoUrl}&t=${timestamp}` : `${logoUrl}?t=${timestamp}`;
        
        const logoBase64 = await fetchImageAsBase64(logoUrl);
        if (logoBase64) {
          console.log("Successfully fetched logo for PDF");
          preparedProps.logoBase64 = logoBase64;
        }
      } catch (error) {
        console.error("Error fetching logo for PDF:", error);
      }
    }
    
    // Fetch signature if available
    if (props.profile?.digital_signature_url && !props.signatureBase64) {
      try {
        console.log("Fetching signature for PDF from URL:", props.profile.digital_signature_url);
        let signatureUrl = props.profile.digital_signature_url;
        
        if (!signatureUrl.startsWith('http') && !signatureUrl.startsWith('data:')) {
          signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${signatureUrl}`;
        }
        
        const timestamp = Date.now();
        signatureUrl = signatureUrl.includes('?') ? `${signatureUrl}&t=${timestamp}` : `${signatureUrl}?t=${timestamp}`;
        
        const signatureBase64 = await fetchImageAsBase64(signatureUrl);
        if (signatureBase64) {
          console.log("Successfully fetched signature for PDF");
          preparedProps.signatureBase64 = signatureBase64;
        }
      } catch (error) {
        console.error("Error fetching signature for PDF:", error);
      }
    }
    
    // Define initial position
    let yPos = 20;
    
    // Render header section (company details)
    // Use await since renderHeader is now an async function
    yPos = await renderHeader(doc, preparedProps, yPos);
    
    // Render customer information
    yPos = renderCustomerInfo(doc, preparedProps, yPos);
    
    // Render products table
    yPos = renderProductsTable(doc, preparedProps, yPos);
    
    // Render totals section
    yPos = renderTotals(doc, preparedProps, yPos);
    
    // Render footer with signature
    renderFooter(doc, preparedProps);
    
    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return handleError(doc, props);
  }
};

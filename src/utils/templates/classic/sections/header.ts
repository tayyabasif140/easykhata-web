
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';
import { fetchImageAsBase64 } from '../utils/images/conversion';

export const renderHeader = async (doc: jsPDF, props: TemplateProps, startY: number): Promise<number> => {
  const { businessDetails, profile, logoBase64 } = props;
  let yPos = startY;
  
  // Add logo if available
  if (logoBase64) {
    try {
      console.log("Adding logo to PDF from base64 data");
      // Position logo at the top left
      doc.addImage(logoBase64, 'PNG', 10, yPos, 40, 40);
      // Add some space from the left for the company name to avoid overlapping with logo
      yPos += 5;
      console.log("Successfully added pre-loaded logo to PDF");
    } catch (e) {
      console.error("Error adding logo to PDF:", e);
    }
  } else if (businessDetails?.business_logo_url) {
    try {
      // Try to fetch the logo from the URL
      console.log("Fetching logo from URL:", businessDetails.business_logo_url);
      let logoUrl = businessDetails.business_logo_url;
      
      // If it's not a full URL, get the full URL
      if (!logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
        // Make sure to use the complete URL including the storage bucket
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ykjtvqztcatrkinzfpov.supabase.co';
        logoUrl = `${supabaseUrl}/storage/v1/object/public/business_files/${logoUrl}`;
        console.log("Constructed full logo URL for PDF:", logoUrl);
      }
      
      // Add cache busting parameter to prevent stale images
      const timestamp = Date.now();
      logoUrl = logoUrl.includes('?') ? `${logoUrl}&t=${timestamp}` : `${logoUrl}?t=${timestamp}`;
      
      try {
        console.log("Attempting to fetch image as base64:", logoUrl);
        const base64Logo = await fetchImageAsBase64(logoUrl);
        
        if (base64Logo) {
          console.log("Successfully fetched and converted logo to base64");
          doc.addImage(base64Logo, 'PNG', 10, yPos, 40, 40);
          yPos += 5;
          console.log("Successfully added logo to PDF from URL");
        } else {
          console.error("Failed to fetch logo for PDF - base64Logo is null or empty");
        }
      } catch (fetchError) {
        console.error("Error fetching logo for PDF:", fetchError);
      }
    } catch (logoError) {
      console.error("Error adding logo to PDF:", logoError);
    }
  }
  
  // Company name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  // Position company name to the right of the logo if logo exists
  const companyNameX = logoBase64 || businessDetails?.business_logo_url ? 60 : 10;
  doc.text(businessDetails?.business_name || 'Company Name', companyNameX, yPos);
  yPos += 10;
  
  // Business details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (businessDetails?.business_address) {
    const addressLines = businessDetails.business_address.toString().split('\n');
    addressLines.forEach((line: string) => {
      doc.text(line, companyNameX, yPos);
      yPos += 5;
    });
  }
  
  if (businessDetails?.website) {
    doc.text(`Website: ${businessDetails.website}`, companyNameX, yPos);
    yPos += 5;
  }
  
  if (profile?.phone_number) {
    doc.text(`Phone: ${profile.phone_number}`, companyNameX, yPos);
    yPos += 5;
  }
  
  if (profile?.email) {
    doc.text(`Email: ${profile.email}`, companyNameX, yPos);
    yPos += 5;
  }
  
  // Ensure we always have enough vertical space after the header (logo or text)
  yPos = Math.max(yPos, (logoBase64 || businessDetails?.business_logo_url) ? startY + 50 : yPos);
  
  // Document title
  yPos += 5;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
  yPos += 10;
  
  return yPos;
};

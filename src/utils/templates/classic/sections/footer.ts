
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';
import { addPrivacyPolicy } from '../utils/privacyPolicy';
import { fetchImageAsBase64 } from '../utils/images/conversion';

export const renderFooter = async (doc: jsPDF, props: TemplateProps): Promise<void> => {
  const { businessDetails, profile, signatureBase64 } = props;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  // Add signature at the bottom of the page, but higher up to avoid privacy policy
  const signatureText = "Authorized Signature:";
  // Adjusted position to be significantly higher to avoid overlapping with privacy policy
  const signaturePosition = pageHeight - 100;
  
  doc.setFont('helvetica', 'bold');
  doc.text(signatureText, 10, signaturePosition);
  
  // Add signature image if available
  if (signatureBase64) {
    try {
      console.log("Adding signature to PDF from base64");
      // Signature is already a full data URL, so we can use it directly
      doc.addImage(signatureBase64, 'PNG', 10, signaturePosition + 1, 60, 25);
      console.log("Successfully added signature to PDF from provided base64");
    } catch (e) {
      console.error("Error adding signature image:", e);
      // If signature image fails, fall back to signature line
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
    }
  } else if (profile?.digital_signature_url) {
    try {
      // Try to fetch the signature from URL
      console.log("Fetching signature from URL:", profile.digital_signature_url);
      let signatureUrl = profile.digital_signature_url;
      
      // If it's not a full URL, get the full URL
      if (!signatureUrl.startsWith('http') && !signatureUrl.startsWith('data:')) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ykjtvqztcatrkinzfpov.supabase.co';
        signatureUrl = `${supabaseUrl}/storage/v1/object/public/business_files/${signatureUrl}`;
        console.log("Constructed full signature URL for PDF:", signatureUrl);
      }
      
      try {
        const base64Signature = await fetchImageAsBase64(signatureUrl);
        
        if (base64Signature) {
          console.log("Successfully fetched and converted signature to base64");
          doc.addImage(base64Signature, 'PNG', 10, signaturePosition + 1, 60, 25);
          console.log("Successfully added signature to PDF from URL");
        } else {
          console.error("Failed to fetch signature for PDF");
          // Fall back to signature line
          doc.setDrawColor(0);
          doc.setLineWidth(0.5);
          doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
        }
      } catch (fetchError) {
        console.error("Error fetching signature for PDF:", fetchError);
        // Fall back to signature line
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
      }
    } catch (signatureError) {
      console.error("Error adding signature to PDF:", signatureError);
      // Fall back to signature line
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
    }
  } else {
    // Add signature line only if no image
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
  }
  
  // Footer with page number only
  const footerYPos = pageHeight - 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(`Page 1`, pageWidth / 2, footerYPos, { align: 'center' });
  
  // Add privacy policy if available
  addPrivacyPolicy(doc, businessDetails);
};

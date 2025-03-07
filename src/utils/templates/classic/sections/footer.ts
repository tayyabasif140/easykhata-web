
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';
import { addPrivacyPolicy } from '../utils/privacyPolicy';

export const renderFooter = (doc: jsPDF, props: TemplateProps): void => {
  const { businessDetails, profile, signatureBase64 } = props;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  // Add signature at the bottom of the page
  const signatureText = "Authorized Signature:";
  const signaturePosition = pageHeight - 40;
  
  doc.setFont('helvetica', 'bold');
  doc.text(signatureText, 10, signaturePosition);
  
  // Add signature image if available
  if (signatureBase64) {
    try {
      // Adjust position for better placement (higher up)
      doc.addImage(signatureBase64, 'PNG', 10, signaturePosition - 30, 60, 30);
    } catch (e) {
      console.error("Error adding signature image:", e);
    }
  } else {
    // Add signature line only if no image
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
  }
  
  // Add business name under signature line or image
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(businessDetails?.business_name || '', 10, signaturePosition + 20);

  // Add signature text placeholder
  if (profile?.name) {
    doc.text(profile.name, 40, signaturePosition + 10);
  }
  
  // Footer with page number only - remove "Generated with invoice manager"
  const footerYPos = pageHeight - 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(`Page 1`, pageWidth / 2, footerYPos, { align: 'center' });
  
  // Add privacy policy if available
  addPrivacyPolicy(doc, businessDetails);
};

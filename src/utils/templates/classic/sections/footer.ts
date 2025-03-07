
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';
import { addPrivacyPolicy } from '../utils/privacyPolicy';

export const renderFooter = (doc: jsPDF, props: TemplateProps): void => {
  const { businessDetails, profile } = props;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  // Add signature at the bottom of the page
  const signatureText = "Authorized Signature:";
  const signaturePosition = pageHeight - 40;
  
  doc.setFont('helvetica', 'bold');
  doc.text(signatureText, 10, signaturePosition);
  
  // Add signature line
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
  
  // Add business name under signature line
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(businessDetails?.business_name || '', 10, signaturePosition + 20);

  // Add signature text placeholder
  if (profile?.name) {
    doc.text(profile.name, 40, signaturePosition + 10);
  }
  
  // Add signature image if available
  if (profile?.signature) {
    try {
      const signatureImg = profile.signature;
      // Adjust the position and size as needed
      doc.addImage(signatureImg, 'PNG', 30, signaturePosition - 5, 40, 20);
    } catch (e) {
      console.error("Error adding signature image:", e);
    }
  }
  
  // Footer with page number
  const footerYPos = pageHeight - 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(`Page 1`, pageWidth / 2, footerYPos, { align: 'center' });
  
  // Add privacy policy if available
  addPrivacyPolicy(doc, businessDetails);
};


import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';

export const renderFooter = async (doc: jsPDF, props: TemplateProps): Promise<void> => {
  const { businessDetails, profile, signatureBase64 } = props;
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  
  // Privacy policy section
  const privacyPolicyPosition = pageHeight - 120;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Privacy Policy:', 10, privacyPolicyPosition);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const policyText = businessDetails?.privacy_policy || 
    'Your privacy is important to us. We protect your personal information.';
  
  const splitText = doc.splitTextToSize(policyText, pageWidth - 20);
  let yPos = privacyPolicyPosition + 7;
  
  // Limit to 3 lines for better layout
  for (let i = 0; i < Math.min(splitText.length, 3); i++) {
    doc.text(splitText[i], 10, yPos);
    yPos += 5;
  }
  
  // Signature section - optimized positioning
  const signaturePosition = pageHeight - 100;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text("Authorized Signature:", 10, signaturePosition);
  
  // Add signature image or fallback line
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', 10, signaturePosition + 1, 60, 25);
    } catch (e) {
      console.error("Error adding signature image:", e);
      // Fallback to signature line
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
    }
  } else {
    // Add signature line
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
  }
  
  // Simplified footer
  const footerYPos = pageHeight - 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(`Page 1`, pageWidth / 2, footerYPos, { align: 'center' });
};

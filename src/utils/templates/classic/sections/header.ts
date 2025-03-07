
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';

export const renderHeader = (doc: jsPDF, props: TemplateProps, startY: number): number => {
  const { businessDetails, profile, logoBase64 } = props;
  let yPos = startY;
  
  // Add logo if available
  if (logoBase64) {
    try {
      // Position logo at the top left
      doc.addImage(logoBase64, 'PNG', 10, yPos, 40, 40);
      // Add some space from the left for the company name to avoid overlapping with logo
      yPos += 5;
    } catch (e) {
      console.error("Error adding logo to PDF:", e);
    }
  }
  
  // Company name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  // Position company name to the right of the logo if logo exists
  const companyNameX = logoBase64 ? 60 : 10;
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
  yPos = Math.max(yPos, logoBase64 ? startY + 50 : yPos);
  
  // Document title
  yPos += 5;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
  yPos += 10;
  
  return yPos;
};


import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';

export const renderHeader = (doc: jsPDF, props: TemplateProps, startY: number): number => {
  const { businessDetails, profile } = props;
  let yPos = startY;
  
  // Company name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(businessDetails?.business_name || 'Company Name', 10, yPos);
  yPos += 10;
  
  // Business details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (businessDetails?.business_address) {
    const addressLines = businessDetails.business_address.toString().split('\n');
    addressLines.forEach((line: string) => {
      doc.text(line, 10, yPos);
      yPos += 5;
    });
  }
  
  if (businessDetails?.website) {
    doc.text(`Website: ${businessDetails.website}`, 10, yPos);
    yPos += 5;
  }
  
  if (profile?.phone_number) {
    doc.text(`Phone: ${profile.phone_number}`, 10, yPos);
    yPos += 5;
  }
  
  if (profile?.email) {
    doc.text(`Email: ${profile.email}`, 10, yPos);
    yPos += 5;
  }
  
  // Document title
  yPos += 5;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
  yPos += 10;
  
  return yPos;
};

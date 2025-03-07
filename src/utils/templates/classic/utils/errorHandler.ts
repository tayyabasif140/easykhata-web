
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';

export const handleError = (doc: jsPDF, props: TemplateProps): jsPDF => {
  const { customerName, total, businessDetails } = props;
  const pageWidth = doc.internal.pageSize.width;
  
  // Create a simplistic PDF if generation fails
  doc.setFontSize(16);
  doc.text('INVOICE', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('Customer: ' + (customerName || 'Customer'), 10, 40);
  doc.text('Amount: ' + (total.toFixed(2) || '0.00'), 10, 50);
  doc.text('Date: ' + new Date().toLocaleDateString(), 10, 60);
  
  if (businessDetails?.business_name) {
    doc.text('From: ' + businessDetails.business_name, 10, 70);
  }
  
  doc.setFontSize(10);
  doc.text('This is a simplified invoice due to generation errors.', 10, 90);
  
  return doc;
};

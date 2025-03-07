
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';

export const renderTotals = (doc: jsPDF, props: TemplateProps, startY: number): number => {
  const { subtotal, tax, total } = props;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPos = startY;
  
  // Check if we need more space for totals
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = 20;
  }
  
  // Line separator
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 85, yPos, pageWidth - 10, yPos);
  yPos += 10;
  
  // Totals
  doc.text('Subtotal:', pageWidth - 85, yPos);
  doc.text(`${subtotal.toFixed(2)}`, pageWidth - 25, yPos);
  yPos += 7;
  
  doc.text('Tax:', pageWidth - 85, yPos);
  doc.text(`${tax.toFixed(2)}`, pageWidth - 25, yPos);
  yPos += 7;
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.line(pageWidth - 85, yPos, pageWidth - 10, yPos);
  yPos += 7;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', pageWidth - 85, yPos);
  doc.text(`${total.toFixed(2)}`, pageWidth - 25, yPos);
  
  // Payment terms and notes
  yPos += 20;
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Terms:', 10, yPos);
  yPos += 7;
  doc.text('Please pay within 14 days of receipt.', 10, yPos);
  
  return yPos;
};

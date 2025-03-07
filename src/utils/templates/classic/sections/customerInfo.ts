
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';

export const renderCustomerInfo = (doc: jsPDF, props: TemplateProps, startY: number): number => {
  const { customerName, companyName, phone, email, dueDate } = props;
  const pageWidth = doc.internal.pageSize.width;
  let yPos = startY;
  
  // Customer information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 10, yPos);
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(customerName || 'Customer', 10, yPos);
  yPos += 5;
  
  if (companyName) {
    doc.text(companyName, 10, yPos);
    yPos += 5;
  }
  
  if (phone) {
    doc.text(`Phone: ${phone}`, 10, yPos);
    yPos += 5;
  }
  
  if (email) {
    doc.text(`Email: ${email}`, 10, yPos);
    yPos += 5;
  }
  
  // Invoice details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, pageWidth - 60, yPos - 15);
  
  if (dueDate) {
    doc.text(`Due Date: ${dueDate instanceof Date ? dueDate.toLocaleDateString() : 'No due date'}`, pageWidth - 60, yPos - 10);
  }
  
  // Line separator
  yPos += 10;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 10;
  
  return yPos;
};

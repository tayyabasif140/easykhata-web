
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';

export const renderProductsTable = (doc: jsPDF, props: TemplateProps, startY: number): number => {
  const { products, isEstimate } = props;
  
  let yPos = startY + 10;
  
  // Table header
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Item", 20, yPos);
  doc.text("Description", 70, yPos);
  doc.text("Qty", 130, yPos);
  doc.text("Price", 150, yPos);
  doc.text("Total", 170, yPos);
  
  // Header line
  doc.line(20, yPos + 2, 190, yPos + 2);
  
  yPos += 10;
  doc.setFont("helvetica", "normal");
  
  // Products
  products.forEach((product) => {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(product.name, 20, yPos);
    
    // Add description if available
    if (product.description) {
      doc.setFontSize(9);
      doc.text(product.description, 70, yPos);
      doc.setFontSize(12);
    }
    
    doc.text(product.quantity.toString(), 130, yPos);
    doc.text(`Rs.${product.price.toFixed(2)}`, 150, yPos);
    doc.text(`Rs.${(product.quantity * product.price).toFixed(2)}`, 170, yPos);
    
    yPos += 10;
  });
  
  // Add custom fields if they exist
  if (props.customFields && Object.keys(props.customFields).length > 0) {
    yPos += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Additional Information:", 20, yPos);
    yPos += 8;
    doc.setFont("helvetica", "normal");
    
    Object.entries(props.customFields).forEach(([key, value]) => {
      if (value) {
        doc.text(`${key}: ${value}`, 20, yPos);
        yPos += 6;
      }
    });
  }
  
  // Bottom line
  doc.line(20, yPos, 190, yPos);
  
  return yPos + 5;
};

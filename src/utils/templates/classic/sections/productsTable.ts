
import jsPDF from 'jspdf';
import { TemplateProps } from '../../../invoiceTemplates';

export const renderProductsTable = (doc: jsPDF, props: TemplateProps, startY: number): number => {
  const { products, isEstimate } = props;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let yPos = startY;
  let currentPage = 1;
  
  // Table header
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 10, yPos);
  doc.text('Description', 60, yPos);
  doc.text('Qty', pageWidth - 90, yPos);
  doc.text('Price', pageWidth - 60, yPos);
  doc.text('Total', pageWidth - 25, yPos);
  yPos += 5;
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 10;
  
  // Table items
  doc.setFont('helvetica', 'normal');
  
  const startNewPage = () => {
    doc.addPage();
    currentPage++;
    yPos = 20;
    
    // Add header for new page
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 10, yPos);
    doc.text('Description', 60, yPos);
    doc.text('Qty', pageWidth - 90, yPos);
    doc.text('Price', pageWidth - 60, yPos);
    doc.text('Total', pageWidth - 25, yPos);
    yPos += 5;
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(10, yPos, pageWidth - 10, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
  };
  
  // Ensure products is an array
  const safeProducts = Array.isArray(products) ? products : [];
  
  for (let i = 0; i < safeProducts.length; i++) {
    const product = safeProducts[i];
    
    // Check if we need to start a new page
    if (yPos > pageHeight - 60) {
      startNewPage();
    }
    
    // Ensure product data is valid
    const productName = product?.name || 'Unknown Product';
    const productDescription = product?.description || '';
    const productQuantity = isNaN(product?.quantity) ? 0 : product.quantity;
    const productPrice = isNaN(product?.price) ? 0 : product.price;
    const productTotal = productQuantity * productPrice;
    
    doc.text(productName, 10, yPos);
    
    // Handle description - split into multiple lines if needed
    if (productDescription) {
      const descriptionLines = doc.splitTextToSize(productDescription, 40);
      if (descriptionLines.length > 1) {
        // If description is long, just show first line
        doc.text(descriptionLines[0] + '...', 60, yPos);
      } else {
        doc.text(productDescription, 60, yPos);
      }
    }
    
    doc.text(productQuantity.toString(), pageWidth - 90, yPos);
    doc.text(`${productPrice.toFixed(2)}`, pageWidth - 60, yPos);
    doc.text(`${productTotal.toFixed(2)}`, pageWidth - 25, yPos);
    
    yPos += 10;
  }
  
  return yPos;
};

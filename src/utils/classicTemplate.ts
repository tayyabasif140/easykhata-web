
import jsPDF from 'jspdf';
import { TemplateProps } from './invoiceTemplates';

export const classicTemplate = async (props: TemplateProps) => {
  const {
    customerName,
    companyName,
    phone,
    email,
    products,
    subtotal,
    tax,
    total,
    dueDate,
    businessDetails,
    profile,
  } = props;

  // Create a new PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Header with business details
  let yPos = 20;
  
  if (businessDetails?.business_logo_url) {
    try {
      const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`;
      const logoWidth = 40;
      const logoHeight = 20;
      doc.addImage(logoUrl, 'JPEG', 10, yPos, logoWidth, logoHeight, undefined, 'FAST');
      yPos += 25;
    } catch (error) {
      console.error('Error loading logo:', error);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(businessDetails?.business_name || 'Company Name', 10, yPos);
      yPos += 10;
    }
  } else {
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(businessDetails?.business_name || 'Company Name', 10, yPos);
    yPos += 10;
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (businessDetails?.business_address) {
    const addressLines = doc.splitTextToSize(businessDetails.business_address, 100);
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
  doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;
  
  // Customer information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 10, yPos);
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(customerName, 10, yPos);
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
    doc.text(`Due Date: ${dueDate.toLocaleDateString()}`, pageWidth - 60, yPos - 10);
  }
  
  // Line separator
  yPos += 10;
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 10;
  
  // Table header
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 10, yPos);
  doc.text('Quantity', pageWidth - 80, yPos);
  doc.text('Price', pageWidth - 50, yPos);
  doc.text('Total', pageWidth - 25, yPos);
  yPos += 5;
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 10;
  
  // Table items
  doc.setFont('helvetica', 'normal');
  let currentPage = 1;
  
  const startNewPage = () => {
    doc.addPage();
    currentPage++;
    yPos = 20;
    
    // Add header for new page
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 10, yPos);
    doc.text('Quantity', pageWidth - 80, yPos);
    doc.text('Price', pageWidth - 50, yPos);
    doc.text('Total', pageWidth - 25, yPos);
    yPos += 5;
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(10, yPos, pageWidth - 10, yPos);
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
  };
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    // Check if we need to start a new page
    if (yPos > pageHeight - 60) {
      startNewPage();
    }
    
    doc.text(product.name, 10, yPos);
    doc.text(product.quantity.toString(), pageWidth - 80, yPos);
    doc.text(`${product.price.toFixed(2)}`, pageWidth - 50, yPos);
    doc.text(`${(product.quantity * product.price).toFixed(2)}`, pageWidth - 25, yPos);
    
    yPos += 10;
  }
  
  // Check if we need more space for totals
  if (yPos > pageHeight - 40) {
    startNewPage();
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
  
  // Add signature if available
  if (profile?.digital_signature_url) {
    try {
      yPos += 20;
      const signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${profile.digital_signature_url}`;
      const signatureWidth = 40;
      const signatureHeight = 20;
      doc.addImage(signatureUrl, 'PNG', pageWidth - 60, yPos, signatureWidth, signatureHeight, undefined, 'FAST');
      
      yPos += signatureHeight + 5;
      doc.setDrawColor(0);
      doc.setLineWidth(0.2);
      doc.line(pageWidth - 60, yPos, pageWidth - 20, yPos);
      
      yPos += 5;
      doc.text('Authorized Signature', pageWidth - 60, yPos);
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }
  
  // Footer with page number
  const footerYPos = pageHeight - 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(`Page ${currentPage}`, pageWidth / 2, footerYPos, { align: 'center' });
  
  return doc;
};

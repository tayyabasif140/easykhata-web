
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
  
  try {
    // Header with business details
    let yPos = 20;
    
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
    doc.text('INVOICE', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
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
      const productQuantity = isNaN(product?.quantity) ? 0 : product.quantity;
      const productPrice = isNaN(product?.price) ? 0 : product.price;
      const productTotal = productQuantity * productPrice;
      
      doc.text(productName, 10, yPos);
      doc.text(productQuantity.toString(), pageWidth - 80, yPos);
      doc.text(`${productPrice.toFixed(2)}`, pageWidth - 50, yPos);
      doc.text(`${productTotal.toFixed(2)}`, pageWidth - 25, yPos);
      
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
    
    // Add signature at the bottom of the page if available
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
    
    // Footer with page number
    const footerYPos = pageHeight - 10;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Page ${currentPage}`, pageWidth / 2, footerYPos, { align: 'center' });
    
    // Add privacy policy if available
    if (businessDetails?.privacy_policy) {
      try {
        // Check if we need a new page for privacy policy (if it's long)
        if (businessDetails.privacy_policy.length > 500) {
          doc.addPage();
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Privacy Policy', 10, 20);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          
          // Split policy text into paragraphs for readable formatting
          const policyText = doc.splitTextToSize(businessDetails.privacy_policy, pageWidth - 20);
          doc.text(policyText, 10, 30);
        } else {
          // For shorter policies, add at bottom of last page
          doc.setFontSize(8);
          doc.text('Privacy Policy:', 10, pageHeight - 30);
          const policyText = doc.splitTextToSize(businessDetails.privacy_policy, pageWidth - 20);
          doc.text(policyText, 10, pageHeight - 25);
        }
      } catch (policyError) {
        console.error("Error adding privacy policy:", policyError);
        // Continue without adding policy
      }
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    
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
  }
  
  return doc;
};


import jsPDF from 'jspdf';
import { TemplateProps } from './invoiceTemplates';

export const diamondTemplate = async (props: TemplateProps) => {
  try {
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
    
    // Set color theme
    const primaryColor = [41, 98, 255]; // RGB
    const secondaryColor = [245, 247, 250]; // Light background

    // Add header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Text-based header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(businessDetails?.business_name || 'Company Name', 10, 20);

    // Document title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 60, 25);

    // Add decorative elements
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.line(10, 45, pageWidth - 10, 45);

    // Business details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 55;
    
    doc.text('From:', 10, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(businessDetails?.business_name || '', 10, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    
    if (businessDetails?.business_address) {
      const addressLines = doc.splitTextToSize(businessDetails.business_address, 80);
      addressLines.forEach((line: string) => {
        doc.text(line, 10, yPos);
        yPos += 5;
      });
    }
    
    if (businessDetails?.website) {
      doc.text(businessDetails.website, 10, yPos);
      yPos += 5;
    }
    
    if (profile?.phone_number) {
      doc.text(`Phone: ${profile.phone_number}`, 10, yPos);
      yPos += 5;
    }
    
    if (profile?.email) {
      doc.text(`Email: ${profile.email}`, 10, yPos);
    }

    // Reset yPos for customer details
    yPos = 55;
    
    // Customer details
    doc.text('Bill To:', pageWidth - 90, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(customerName, pageWidth - 90, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    
    if (companyName) {
      doc.text(companyName, pageWidth - 90, yPos);
      yPos += 5;
    }
    
    if (phone) {
      doc.text(`Phone: ${phone}`, pageWidth - 90, yPos);
      yPos += 5;
    }
    
    if (email) {
      doc.text(`Email: ${email}`, pageWidth - 90, yPos);
      yPos += 5;
    }

    // Invoice details with styled box
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.roundedRect(pageWidth - 90, yPos, 80, 25, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Date:', pageWidth - 85, yPos + 8);
    doc.text('Due Date:', pageWidth - 85, yPos + 18);
    
    const currentDate = new Date().toLocaleDateString();
    const formattedDueDate = dueDate ? dueDate.toLocaleDateString() : 'N/A';
    
    doc.setFont('helvetica', 'normal');
    doc.text(currentDate, pageWidth - 40, yPos + 8);
    doc.text(formattedDueDate, pageWidth - 40, yPos + 18);

    // Products table
    yPos = 110;
    
    // Table header with different style
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(10, yPos, pageWidth - 20, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('Product', 15, yPos + 7);
    doc.text('Qty', pageWidth - 85, yPos + 7);
    doc.text('Price', pageWidth - 60, yPos + 7);
    doc.text('Total', pageWidth - 30, yPos + 7);
    
    yPos += 10;
    
    // Table rows with alternating colors
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    let altRow = false;
    let totalRows = products.length;
    let currentPage = 1;
    
    const startNewPage = () => {
      doc.addPage();
      currentPage++;
      // Reset position for new page
      yPos = 20;
      // Add page header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, yPos, pageWidth - 20, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Product', 15, yPos + 7);
      doc.text('Qty', pageWidth - 85, yPos + 7);
      doc.text('Price', pageWidth - 60, yPos + 7);
      doc.text('Total', pageWidth - 30, yPos + 7);
      
      yPos += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
    };
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // Check if we need a new page
      if (yPos > pageHeight - 50) {
        startNewPage();
      }
      
      if (altRow) {
        doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.rect(10, yPos, pageWidth - 20, 10, 'F');
      }
      
      doc.text(product.name, 15, yPos + 7);
      doc.text(product.quantity.toString(), pageWidth - 85, yPos + 7);
      doc.text(`${product.price.toFixed(2)}`, pageWidth - 60, yPos + 7);
      doc.text(`${(product.quantity * product.price).toFixed(2)}`, pageWidth - 30, yPos + 7);
      
      yPos += 10;
      altRow = !altRow;
    }

    // Totals - check if we need a new page
    if (yPos > pageHeight - 80) {
      startNewPage();
    }
    
    yPos += 10;
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos);
    
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', pageWidth - 80, yPos);
    doc.text(`${subtotal.toFixed(2)}`, pageWidth - 30, yPos);
    
    yPos += 10;
    
    doc.text('Tax:', pageWidth - 80, yPos);
    doc.text(`${tax.toFixed(2)}`, pageWidth - 30, yPos);
    
    yPos += 5;
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos);
    
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', pageWidth - 80, yPos);
    doc.text(`${total.toFixed(2)}`, pageWidth - 30, yPos);

    // Add payment details and terms - check if we need a new page
    if (yPos > pageHeight - 60) {
      startNewPage();
    }
    
    yPos += 25;
    
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.roundedRect(10, yPos, pageWidth - 20, 40, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Payment Details', 15, yPos + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Thank you for your business!', 15, yPos + 20);
    doc.text('Please make payment by the due date.', 15, yPos + 30);

    // Footer
    const footerYPos = doc.internal.pageSize.height - 10;
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.line(10, footerYPos - 15, pageWidth - 10, footerYPos - 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Page ${currentPage}`, 10, footerYPos);
    doc.text('Generated with Invoice Manager', pageWidth / 2, footerYPos, { align: 'center' });

    return doc;
  } catch (error) {
    console.error("Error in diamond template:", error);
    // Create a fallback simple PDF
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Invoice", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Customer: ${props.customerName || 'N/A'}`, 20, 40);
    doc.text(`Total: ${props.total || 0}`, 20, 50);
    doc.text("Sorry, there was an error generating the detailed invoice.", 20, 70);
    return doc;
  }
};

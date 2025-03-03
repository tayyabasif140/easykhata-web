
import jsPDF from 'jspdf';
import { TemplateProps } from './invoiceTemplates';

export const classicTemplate = async (data: TemplateProps): Promise<jsPDF> => {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Define constants
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  
  // Set font
  doc.setFont('helvetica');
  
  // Add Business Logo if available
  if (data.businessDetails?.business_logo_url) {
    try {
      const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${data.businessDetails.business_logo_url}`;
      const imgProps = await loadImage(doc, logoUrl, margin, margin, 40);
      doc.addImage(imgProps.img, imgProps.format, margin, margin, imgProps.width, imgProps.height);
    } catch (error) {
      console.error('Error loading logo:', error);
      // If logo fails to load, display text instead
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(data.businessDetails?.business_name || 'Business Name', margin, margin + 10);
    }
  } else {
    // No logo, display business name
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text(data.businessDetails?.business_name || 'Business Name', margin, margin + 10);
  }
  
  // Add Business details at top right
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const businessInfoY = margin + 5;
  doc.text(data.businessDetails?.business_address || '', pageWidth - margin, businessInfoY, { align: 'right' });
  doc.text(data.businessDetails?.website || '', pageWidth - margin, businessInfoY + 5, { align: 'right' });
  doc.text(`NTN: ${data.businessDetails?.ntn_number || ''}`, pageWidth - margin, businessInfoY + 10, { align: 'right' });
  
  // Add Invoice title
  doc.setFontSize(24);
  doc.setTextColor(50, 50, 50);
  doc.text('INVOICE', margin, margin + 30);
  
  // Add date and invoice number
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const today = new Date();
  doc.text(`Date: ${today.toLocaleDateString()}`, margin, margin + 40);
  
  // If due date is provided
  if (data.dueDate) {
    doc.text(`Due: ${data.dueDate.toLocaleDateString()}`, margin, margin + 45);
  }
  
  // Customer information - left side
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.text('Bill To:', margin, margin + 55);
  doc.setFontSize(10);
  doc.text(data.customerName, margin, margin + 62);
  
  if (data.companyName) {
    doc.text(data.companyName, margin, margin + 67);
  }
  
  if (data.phone) {
    doc.text(`Phone: ${data.phone}`, margin, margin + 72);
  }
  
  if (data.email) {
    doc.text(`Email: ${data.email}`, margin, margin + 77);
  }
  
  // Products Table
  const tableTop = margin + 90;
  const tableHeaders = ['Item', 'Quantity', 'Price', 'Total'];
  const colWidths = [contentWidth * 0.5, contentWidth * 0.15, contentWidth * 0.15, contentWidth * 0.2];
  
  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableTop, contentWidth, 8, 'F');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  let currentX = margin;
  tableHeaders.forEach((header, i) => {
    const align = i === 0 ? 'left' : 'right';
    if (i === 0) {
      doc.text(header, currentX + 2, tableTop + 5);
    } else {
      doc.text(header, currentX + colWidths[i] - 2, tableTop + 5, { align: 'right' });
    }
    currentX += colWidths[i];
  });
  
  // Table rows
  let currentY = tableTop + 8;
  const lineHeight = 8;
  let pageIndex = 1;
  
  // Function to add a new page if needed
  const checkForNewPage = (requiredSpace: number): void => {
    if (currentY + requiredSpace > pageHeight - margin) {
      doc.addPage();
      pageIndex++;
      currentY = margin + 20;
      
      // Add header to new page
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${pageIndex}`, pageWidth - margin, margin, { align: 'right' });
      
      // Add table header to new page
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY, contentWidth, 8, 'F');
      
      currentX = margin;
      tableHeaders.forEach((header, i) => {
        const align = i === 0 ? 'left' : 'right';
        if (i === 0) {
          doc.text(header, currentX + 2, currentY + 5);
        } else {
          doc.text(header, currentX + colWidths[i] - 2, currentY + 5, { align: 'right' });
        }
        currentX += colWidths[i];
      });
      
      currentY += 8;
    }
  };
  
  // Add table rows
  data.products.forEach((product, index) => {
    // Check if we need a new page
    checkForNewPage(lineHeight);
    
    // Zebra striping for rows
    if (index % 2 !== 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, currentY, contentWidth, lineHeight, 'F');
    }
    
    doc.setTextColor(60, 60, 60);
    
    // Item name
    doc.text(product.name, margin + 2, currentY + 5);
    
    // Quantity (right aligned)
    doc.text(product.quantity.toString(), 
      margin + colWidths[0] + colWidths[1] - 2, 
      currentY + 5, 
      { align: 'right' });
    
    // Price (right aligned)
    doc.text(`Rs.${product.price.toLocaleString()}`, 
      margin + colWidths[0] + colWidths[1] + colWidths[2] - 2, 
      currentY + 5, 
      { align: 'right' });
    
    // Total (right aligned)
    const total = product.quantity * product.price;
    doc.text(`Rs.${total.toLocaleString()}`, 
      margin + contentWidth - 2, 
      currentY + 5, 
      { align: 'right' });
    
    currentY += lineHeight;
  });
  
  // Summary section
  checkForNewPage(30);
  
  // Draw line
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 5;
  
  const summaryX = margin + contentWidth - 70;
  doc.setFontSize(10);
  
  // Subtotal
  doc.text('Subtotal:', summaryX, currentY + 5);
  doc.text(`Rs.${data.subtotal.toLocaleString()}`, margin + contentWidth - 2, currentY + 5, { align: 'right' });
  currentY += 8;
  
  // Tax
  if (data.tax) {
    doc.text('Tax:', summaryX, currentY + 5);
    doc.text(`Rs.${data.tax.toLocaleString()}`, margin + contentWidth - 2, currentY + 5, { align: 'right' });
    currentY += 8;
  }
  
  // Total
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('Total:', summaryX, currentY + 5);
  doc.text(`Rs.${data.total.toLocaleString()}`, margin + contentWidth - 2, currentY + 5, { align: 'right' });
  currentY += 15;
  
  // Add signature if available
  if (data.profile?.digital_signature_url) {
    checkForNewPage(30);
    
    try {
      const signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${data.profile.digital_signature_url}`;
      const imgProps = await loadImage(doc, signatureUrl, 0, 0, 40);
      doc.addImage(imgProps.img, imgProps.format, margin, currentY, imgProps.width, imgProps.height);
      currentY += imgProps.height + 5;
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }
  
  // Add authorized by text
  checkForNewPage(15);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Authorized by:', margin, currentY + 5);
  doc.text(data.profile?.full_name || '', margin, currentY + 12);
  
  return doc;
};

// Helper function to load an image and get properties for positioning
const loadImage = async (doc: jsPDF, url: string, x: number, y: number, maxWidth: number): Promise<{
  img: any;
  format: string;
  width: number;
  height: number;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      try {
        // Calculate aspect ratio to maintain proportions
        const aspectRatio = img.width / img.height;
        let width = maxWidth;
        let height = width / aspectRatio;
        
        // Determine image format
        const format = url.split('.').pop()?.toLowerCase() === 'png' ? 'PNG' : 'JPEG';
        
        // Create canvas to convert image to data URL
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        
        resolve({
          img,
          format,
          width,
          height
        });
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = (err) => {
      reject(err);
    };
    
    img.src = url;
  });
};


import jsPDF from 'jspdf';

interface TemplateProps {
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  products: {
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: Date;
  businessDetails: any;
  profile: any;
}

export const diamondTemplate = async (props: TemplateProps) => {
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
  
  // Set color theme
  const primaryColor = [41, 98, 255]; // RGB
  const secondaryColor = [245, 247, 250]; // Light background

  // Add gradient header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Add business logo if available
  let logoHeight = 0;
  if (businessDetails?.business_logo_url) {
    try {
      const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`;
      const logoWidth = 50;
      logoHeight = 20;
      doc.addImage(logoUrl, 'JPEG', 10, 10, logoWidth, logoHeight, undefined, 'FAST');
    } catch (error) {
      console.error('Error loading logo:', error);
      // Fall back to text-based header
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(businessDetails?.business_name || 'Company Name', 10, 20);
    }
  } else {
    // Text-based header if no logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(businessDetails?.business_name || 'Company Name', 10, 20);
  }

  // Document title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 60, 20);

  // Add decorative elements
  doc.setDrawColor(...primaryColor);
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

  // Invoice details
  doc.setFillColor(...secondaryColor);
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
  
  // Table header
  doc.setFillColor(...primaryColor);
  doc.rect(10, yPos, pageWidth - 20, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Product', 15, yPos + 7);
  doc.text('Qty', pageWidth - 85, yPos + 7);
  doc.text('Price', pageWidth - 60, yPos + 7);
  doc.text('Total', pageWidth - 30, yPos + 7);
  
  yPos += 10;
  
  // Table rows
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  let altRow = false;
  products.forEach((product) => {
    if (altRow) {
      doc.setFillColor(...secondaryColor);
      doc.rect(10, yPos, pageWidth - 20, 10, 'F');
    }
    
    doc.text(product.name, 15, yPos + 7);
    doc.text(product.quantity.toString(), pageWidth - 85, yPos + 7);
    doc.text(`${product.price.toFixed(2)}`, pageWidth - 60, yPos + 7);
    doc.text(`${(product.quantity * product.price).toFixed(2)}`, pageWidth - 30, yPos + 7);
    
    yPos += 10;
    altRow = !altRow;
  });

  // Totals
  yPos += 10;
  
  doc.setDrawColor(...primaryColor);
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
  
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos);
  
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', pageWidth - 80, yPos);
  doc.text(`${total.toFixed(2)}`, pageWidth - 30, yPos);

  // Add payment details and terms
  yPos += 25;
  
  doc.setFillColor(...secondaryColor);
  doc.roundedRect(10, yPos, pageWidth - 20, 40, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Payment Details', 15, yPos + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Thank you for your business!', 15, yPos + 20);
  doc.text('Please make payment by the due date.', 15, yPos + 30);

  // Add signature if available
  if (profile?.digital_signature_url) {
    try {
      const signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${profile.digital_signature_url}`;
      const signatureWidth = 40;
      const signatureHeight = 20;
      doc.addImage(signatureUrl, 'PNG', pageWidth - 60, yPos + 10, signatureWidth, signatureHeight, undefined, 'FAST');
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(pageWidth - 60, yPos + 35, pageWidth - 20, yPos + 35);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Authorized Signature', pageWidth - 60, yPos + 40);
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }

  // Footer
  const footerYPos = doc.internal.pageSize.height - 10;
  
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.line(10, footerYPos - 15, pageWidth - 10, footerYPos - 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Generated with Invoice Manager', pageWidth / 2, footerYPos, { align: 'center' });

  return doc;
};

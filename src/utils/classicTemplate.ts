
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
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(businessDetails?.business_name || 'Company Name', 10, 20);
    }
  } else {
    // Text-based header if no logo
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(businessDetails?.business_name || 'Company Name', 10, 20);
  }

  // Document title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 60, 20);

  // Business details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 35;
  
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
    yPos += 5;
  }

  // Customer details
  yPos = 35;
  
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
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', pageWidth - 90, yPos);
  doc.text('Due Date:', pageWidth - 90, yPos + 5);
  
  const currentDate = new Date().toLocaleDateString();
  const formattedDueDate = dueDate ? dueDate.toLocaleDateString() : 'N/A';
  
  doc.setFont('helvetica', 'normal');
  doc.text(currentDate, pageWidth - 50, yPos);
  doc.text(formattedDueDate, pageWidth - 50, yPos + 5);

  // Products table
  yPos = 80;
  
  // Table header
  doc.setDrawColor(0);
  doc.setFillColor(240, 240, 240);
  doc.rect(10, yPos, pageWidth - 20, 10, 'F');
  doc.setLineWidth(0.1);
  doc.line(10, yPos, pageWidth - 10, yPos);
  doc.line(10, yPos + 10, pageWidth - 10, yPos + 10);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Product', 15, yPos + 7);
  doc.text('Qty', pageWidth - 85, yPos + 7);
  doc.text('Price', pageWidth - 60, yPos + 7);
  doc.text('Total', pageWidth - 30, yPos + 7);
  
  yPos += 10;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  
  products.forEach((product, index) => {
    doc.rect(10, yPos, pageWidth - 20, 8, index % 2 === 0 ? 'S' : 'F');
    
    doc.text(product.name, 15, yPos + 6);
    doc.text(product.quantity.toString(), pageWidth - 85, yPos + 6);
    doc.text(`${product.price.toFixed(2)}`, pageWidth - 60, yPos + 6);
    doc.text(`${(product.quantity * product.price).toFixed(2)}`, pageWidth - 30, yPos + 6);
    
    yPos += 8;
  });

  // Totals
  yPos += 10;
  
  doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos);
  
  yPos += 5;
  
  doc.text('Subtotal:', pageWidth - 80, yPos);
  doc.text(`${subtotal.toFixed(2)}`, pageWidth - 30, yPos);
  
  yPos += 5;
  
  doc.text('Tax:', pageWidth - 80, yPos);
  doc.text(`${tax.toFixed(2)}`, pageWidth - 30, yPos);
  
  yPos += 5;
  
  doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos);
  
  yPos += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', pageWidth - 80, yPos);
  doc.text(`${total.toFixed(2)}`, pageWidth - 30, yPos);

  // Add signature if available
  yPos += 20;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 10, yPos);
  
  if (profile?.digital_signature_url) {
    try {
      const signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${profile.digital_signature_url}`;
      doc.addImage(signatureUrl, 'PNG', pageWidth - 60, yPos, 40, 20, undefined, 'FAST');
      
      doc.line(pageWidth - 60, yPos + 25, pageWidth - 20, yPos + 25);
      doc.setFontSize(8);
      doc.text('Authorized Signature', pageWidth - 60, yPos + 30);
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }

  return doc;
};

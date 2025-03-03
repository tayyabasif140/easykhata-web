
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

export const professionalTemplate = async (props: TemplateProps) => {
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
  
  // Add header with color
  doc.setFillColor(51, 102, 204); // Blue header
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  // Add business logo if available
  let logoHeight = 0;
  if (businessDetails?.business_logo_url) {
    try {
      const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`;
      const logoWidth = 50;
      logoHeight = 20;
      doc.addImage(logoUrl, 'JPEG', 10, 5, logoWidth, logoHeight, undefined, 'FAST');
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

  // Document title on header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 60, 20);

  // Business details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 40;
  
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

  // Customer details in a box
  doc.setDrawColor(51, 102, 204);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 100, 40, 90, 40, 3, 3, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', pageWidth - 95, 48);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(customerName, pageWidth - 95, 55);
  
  let customerYPos = 60;
  
  if (companyName) {
    doc.text(companyName, pageWidth - 95, customerYPos);
    customerYPos += 5;
  }
  
  if (phone) {
    doc.text(`Phone: ${phone}`, pageWidth - 95, customerYPos);
    customerYPos += 5;
  }
  
  if (email) {
    doc.text(`Email: ${email}`, pageWidth - 95, customerYPos);
    customerYPos += 5;
  }

  // Invoice details
  yPos = 75;
  
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(10, yPos, 80, 25, 3, 3, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', 15, yPos + 8);
  doc.text('Due Date:', 15, yPos + 18);
  
  const currentDate = new Date().toLocaleDateString();
  const formattedDueDate = dueDate ? dueDate.toLocaleDateString() : 'N/A';
  
  doc.setFont('helvetica', 'normal');
  doc.text(currentDate, 50, yPos + 8);
  doc.text(formattedDueDate, 50, yPos + 18);

  // Products table
  yPos = 110;
  
  // Table header with professional styling
  doc.setFillColor(51, 102, 204);
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
  
  products.forEach((product, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(10, yPos, pageWidth - 20, 8, 'F');
    }
    
    doc.text(product.name, 15, yPos + 6);
    doc.text(product.quantity.toString(), pageWidth - 85, yPos + 6);
    doc.text(`${product.price.toFixed(2)}`, pageWidth - 60, yPos + 6);
    doc.text(`${(product.quantity * product.price).toFixed(2)}`, pageWidth - 30, yPos + 6);
    
    yPos += 8;
  });

  // Totals in styled box
  yPos += 10;
  
  doc.setDrawColor(51, 102, 204);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 90, yPos, 80, 40, 3, 3, 'S');
  
  yPos += 10;
  
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', pageWidth - 80, yPos);
  doc.text(`${subtotal.toFixed(2)}`, pageWidth - 30, yPos);
  
  yPos += 10;
  
  doc.text('Tax:', pageWidth - 80, yPos);
  doc.text(`${tax.toFixed(2)}`, pageWidth - 30, yPos);
  
  yPos += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', pageWidth - 80, yPos);
  doc.text(`${total.toFixed(2)}`, pageWidth - 30, yPos);

  // Add signature and notes
  yPos += 30;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Thank you for your business! Payment is due within the specified terms.', 10, yPos);
  
  if (profile?.digital_signature_url) {
    try {
      const signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${profile.digital_signature_url}`;
      doc.addImage(signatureUrl, 'PNG', pageWidth - 60, yPos - 10, 40, 20, undefined, 'FAST');
      
      doc.setDrawColor(0);
      doc.setLineWidth(0.1);
      doc.line(pageWidth - 60, yPos + 15, pageWidth - 20, yPos + 15);
      
      doc.setFontSize(8);
      doc.text('Authorized Signature', pageWidth - 60, yPos + 20);
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  }

  // Footer
  const footerYPos = doc.internal.pageSize.height - 10;
  
  doc.setDrawColor(51, 102, 204);
  doc.setLineWidth(0.5);
  doc.line(10, footerYPos - 5, pageWidth - 10, footerYPos - 5);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Generated with Invoice Manager', pageWidth / 2, footerYPos, { align: 'center' });

  return doc;
};


import jsPDF from 'jspdf';
import { classicTemplate } from './templates/classic';
import { professionalTemplate } from './professionalTemplate';
import { diamondTemplate } from './diamondTemplate';

export interface TemplateProps {
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  products: {
    name: string;
    quantity: number;
    price: number;
    description?: string;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: Date;
  businessDetails: any;
  profile: any;
  signatureBase64?: string | null;
  logoBase64?: string | null;
  isEstimate?: boolean;
  customFields?: { [key: string]: string };
}

export interface InvoiceData extends TemplateProps {}

export const templates = {
  classic: classicTemplate,
  professional: professionalTemplate,
  diamond: diamondTemplate
};

// Optimized sanitization with better defaults
const sanitizeInvoiceData = (data: InvoiceData): InvoiceData => {
  return {
    customerName: data.customerName?.trim() || 'Customer',
    companyName: data.companyName?.trim() || '',
    phone: data.phone?.trim() || '',
    email: data.email?.trim() || '',
    products: data.products && Array.isArray(data.products) && data.products.length > 0 ? 
      data.products.map(product => ({
        name: product.name?.trim() || 'Product',
        quantity: Math.max(1, product.quantity || 1),
        price: Math.max(0, product.price || 0),
        description: product.description?.trim() || ''
      })) : 
      [{ name: 'Product', quantity: 1, price: 0, description: '' }],
    subtotal: Math.max(0, data.subtotal || 0),
    tax: Math.max(0, data.tax || 0),
    total: Math.max(0, data.total || 0),
    dueDate: data.dueDate,
    businessDetails: data.businessDetails || {},
    profile: data.profile || {},
    logoBase64: data.logoBase64 || null,
    signatureBase64: data.signatureBase64 || null,
    isEstimate: data.isEstimate || false
  };
};

// Simplified fallback PDF generator
const createFallbackPDF = (data: InvoiceData): jsPDF => {
  const pdf = new jsPDF();
  
  pdf.setFontSize(20);
  pdf.text(data.isEstimate ? "ESTIMATE" : "INVOICE", 105, 20, { align: "center" });
  
  pdf.setFontSize(12);
  pdf.text(`Customer: ${data.customerName}`, 20, 40);
  pdf.text(`Company: ${data.companyName || "N/A"}`, 20, 50);
  pdf.text(`Total: Rs.${data.total}`, 20, 60);
  pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 70);
  
  let y = 90;
  pdf.text("Products:", 20, y);
  y += 10;
  
  data.products.forEach((product, index) => {
    pdf.text(`${index + 1}. ${product.name} (${product.quantity} x Rs.${product.price})`, 25, y);
    if (product.description) {
      y += 8;
      pdf.text(`   ${product.description}`, 25, y);
    }
    y += 8;
  });
  
  return pdf;
};

// Optimized PDF generation with better error handling
export const generateInvoicePDF = async (templateName: string, data: InvoiceData): Promise<jsPDF> => {
  try {
    const templateKey = (templateName && templateName in templates) ? 
      templateName as keyof typeof templates : 
      'classic';
      
    const templateFn = templates[templateKey];
    const cleanData = sanitizeInvoiceData(data);
    
    // Ensure company name is available
    if (!cleanData.companyName && cleanData.businessDetails?.business_name) {
      cleanData.companyName = cleanData.businessDetails.business_name;
    }
    
    const pdf = await templateFn(cleanData);
    
    if (!pdf || !(pdf instanceof jsPDF)) {
      throw new Error("PDF object was not properly created");
    }
    
    return pdf;
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    // Return simplified fallback instead of complex error handling
    return createFallbackPDF(sanitizeInvoiceData(data));
  }
};


import jsPDF from 'jspdf';
import { classicTemplate } from './classicTemplate';
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
  }[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: Date;
  businessDetails: any;
  profile: any;
}

export interface InvoiceData {
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

export const templates = {
  modern: classicTemplate, // Renamed from classic to modern
  professional: professionalTemplate,
  diamond: diamondTemplate
};

// Clean and normalize data to prevent null values
const sanitizeInvoiceData = (data: InvoiceData): InvoiceData => {
  return {
    customerName: data.customerName || 'Customer',
    companyName: data.companyName || '',
    phone: data.phone || '',
    email: data.email || '',
    products: data.products && data.products.length > 0 ? 
      data.products.map(product => ({
        name: product.name || 'Product',
        quantity: product.quantity || 1,
        price: product.price || 0
      })) : 
      [{ name: 'Product', quantity: 1, price: 0 }],
    subtotal: data.subtotal || 0,
    tax: data.tax || 0,
    total: data.total || 0,
    dueDate: data.dueDate,
    businessDetails: data.businessDetails || {},
    profile: data.profile || {}
  };
};

// Try to create a PDF with error handling
export const generateInvoicePDF = async (templateName: string, data: InvoiceData): Promise<jsPDF> => {
  try {
    // Make sure we have a valid template name or default to modern
    const templateKey = (templateName && templateName in templates) ? 
      templateName as keyof typeof templates : 
      'modern';
      
    const templateFn = templates[templateKey];
    
    // Sanitize data to prevent null values
    const cleanData = sanitizeInvoiceData(data);
    
    if (!cleanData.companyName && cleanData.businessDetails?.business_name) {
      // Ensure we have a company name from business details if not provided directly
      cleanData.companyName = cleanData.businessDetails.business_name;
    }
    
    const pdf = await templateFn(cleanData);
    return pdf;
  } catch (error) {
    console.error("Error generating invoice PDF:", error);
    // Create a fallback PDF with error message
    const pdf = new jsPDF();
    pdf.setFontSize(20);
    pdf.text("Invoice Generation Error", 20, 30);
    pdf.setFontSize(12);
    pdf.text("There was an error generating this invoice.", 20, 50);
    pdf.text("Please ensure all required information is provided:", 20, 60);
    pdf.text("- Business name and details", 25, 70);
    pdf.text("- Customer information", 25, 80);
    pdf.text("- Product details", 25, 90);
    
    pdf.setFontSize(10);
    pdf.text("If this error persists, please contact support.", 20, 110);
    return pdf;
  }
};

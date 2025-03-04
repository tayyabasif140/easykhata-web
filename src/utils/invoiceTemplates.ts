
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

// Create a fallback PDF with error message
const createFallbackPDF = (error: any): jsPDF => {
  console.error("Error generating invoice PDF:", error);
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
    
    // Attempt to generate PDF with the selected template
    let pdf: jsPDF;
    try {
      pdf = await templateFn(cleanData);
      
      // Verify the PDF was actually created
      if (!pdf || !(pdf instanceof jsPDF)) {
        throw new Error("PDF object was not properly created");
      }
      
      return pdf;
    } catch (templateError) {
      console.error(`Error with ${templateKey} template:`, templateError);
      
      // If the selected template fails, try modern as fallback
      if (templateKey !== 'modern') {
        console.log("Falling back to modern template");
        try {
          pdf = await templates.modern(cleanData);
          return pdf;
        } catch (fallbackError) {
          return createFallbackPDF(fallbackError);
        }
      } else {
        return createFallbackPDF(templateError);
      }
    }
  } catch (error) {
    return createFallbackPDF(error);
  }
};

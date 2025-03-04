
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

// Try to create a PDF with error handling
export const generateInvoicePDF = async (templateName: string, data: InvoiceData): Promise<jsPDF> => {
  try {
    // Make sure we have a valid template name or default to modern
    const templateKey = (templateName && templateName in templates) ? 
      templateName as keyof typeof templates : 
      'modern';
      
    const templateFn = templates[templateKey];
    
    if (!data.companyName && data.businessDetails?.business_name) {
      // Ensure we have a company name from business details if not provided directly
      data.companyName = data.businessDetails.business_name;
    }
    
    const pdf = await templateFn(data);
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

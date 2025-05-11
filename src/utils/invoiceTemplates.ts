
import jsPDF from 'jspdf';
import { classicTemplate } from './templates/classic';
import { professionalTemplate } from './professionalTemplate';
import { diamondTemplate } from './diamondTemplate';
import { fetchImageAsBase64 } from './templates/classic/utils/images/conversion';

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
  signatureBase64?: string | null;
  logoBase64?: string | null;
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
  logoBase64?: string | null;
  signatureBase64?: string | null;
}

export const templates = {
  classic: classicTemplate,
  professional: professionalTemplate,
  diamond: diamondTemplate
};

const sanitizeInvoiceData = (data: InvoiceData): InvoiceData => {
  console.log("Sanitizing invoice data:", data);
  
  const sanitizedData = {
    customerName: data.customerName || 'Customer',
    companyName: data.companyName || '',
    phone: data.phone || '',
    email: data.email || '',
    products: data.products && Array.isArray(data.products) && data.products.length > 0 ? 
      data.products.map(product => ({
        name: product.name || 'Product',
        quantity: isNaN(product.quantity) ? 1 : product.quantity || 1,
        price: isNaN(product.price) ? 0 : product.price || 0
      })) : 
      [{ name: 'Product', quantity: 1, price: 0 }],
    subtotal: isNaN(data.subtotal) ? 0 : data.subtotal || 0,
    tax: isNaN(data.tax) ? 0 : data.tax || 0,
    total: isNaN(data.total) ? 0 : data.total || 0,
    dueDate: data.dueDate,
    businessDetails: data.businessDetails || {},
    profile: data.profile || {},
    logoBase64: data.logoBase64 || null,
    signatureBase64: data.signatureBase64 || null
  };
  
  console.log("Sanitized invoice data:", sanitizedData);
  return sanitizedData;
};

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

export const generateInvoicePDF = async (templateName: string, data: InvoiceData): Promise<jsPDF> => {
  try {
    console.log(`Generating invoice PDF with template: ${templateName}`, data);
    
    // Process logo if provided as a path
    if (data.businessDetails?.business_logo_url && !data.logoBase64) {
      try {
        let logoUrl = data.businessDetails.business_logo_url;
        if (!logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
          logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${logoUrl}`;
        }
        console.log("Attempting to fetch logo for PDF:", logoUrl);
        data.logoBase64 = await fetchImageAsBase64(logoUrl);
      } catch (error) {
        console.error("Error fetching logo for PDF:", error);
      }
    }
    
    // Process signature if provided as a path
    if (data.profile?.digital_signature_url && !data.signatureBase64) {
      try {
        let signatureUrl = data.profile.digital_signature_url;
        if (!signatureUrl.startsWith('http') && !signatureUrl.startsWith('data:')) {
          signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${signatureUrl}`;
        }
        console.log("Attempting to fetch signature for PDF:", signatureUrl);
        data.signatureBase64 = await fetchImageAsBase64(signatureUrl);
      } catch (error) {
        console.error("Error fetching signature for PDF:", error);
      }
    }
    
    const templateKey = (templateName && templateName in templates) ? 
      templateName as keyof typeof templates : 
      'classic';
      
    console.log(`Using template: ${templateKey}`);
    const templateFn = templates[templateKey];
    
    const cleanData = sanitizeInvoiceData(data);
    
    if (!cleanData.companyName && cleanData.businessDetails?.business_name) {
      cleanData.companyName = cleanData.businessDetails.business_name;
    }
    
    let pdf: jsPDF;
    try {
      console.log(`Calling ${templateKey} template function with data:`, cleanData);
      pdf = await templateFn(cleanData);
      
      if (!pdf || !(pdf instanceof jsPDF)) {
        console.error(`PDF object was not properly created by ${templateKey} template`);
        throw new Error("PDF object was not properly created");
      }
      
      console.log("PDF successfully generated");
      return pdf;
    } catch (templateError) {
      console.error(`Error with ${templateKey} template:`, templateError);
      
      if (templateKey !== 'classic') {
        console.log("Falling back to classic template");
        try {
          pdf = await templates.classic(cleanData);
          console.log("Fallback template (classic) succeeded");
          return pdf;
        } catch (fallbackError) {
          console.error("Fallback template also failed:", fallbackError);
          return createSimplifiedPDF(cleanData);
        }
      } else {
        return createSimplifiedPDF(cleanData);
      }
    }
  } catch (error) {
    console.error("Unexpected error in generateInvoicePDF:", error);
    return createSimplifiedPDF(data);
  }
};

const createSimplifiedPDF = (data: InvoiceData): jsPDF => {
  try {
    console.log("Creating simplified PDF as fallback");
    const pdf = new jsPDF();
    
    pdf.setFontSize(22);
    pdf.setTextColor(0, 0, 0);
    pdf.text("INVOICE", 105, 20, { align: "center" });
    
    pdf.setFontSize(12);
    pdf.text(`Company: ${data.companyName || "Your Business"}`, 20, 40);
    pdf.text(`Email: ${data.email || ""}`, 20, 48);
    pdf.text(`Phone: ${data.phone || ""}`, 20, 56);
    
    pdf.text(`Customer: ${data.customerName || "Customer"}`, 20, 72);
    
    if (data.dueDate) {
      let dueDateStr = "";
      try {
        dueDateStr = new Date(data.dueDate).toLocaleDateString();
      } catch (e) {
        dueDateStr = String(data.dueDate);
      }
      pdf.text(`Due Date: ${dueDateStr}`, 20, 80);
    }
    
    pdf.line(20, 90, 190, 90);
    pdf.text("Product", 22, 98);
    pdf.text("Quantity", 100, 98);
    pdf.text("Price", 140, 98);
    pdf.text("Total", 170, 98);
    pdf.line(20, 102, 190, 102);
    
    let y = 110;
    data.products.forEach((product) => {
      pdf.text(product.name || "Product", 22, y);
      pdf.text(String(product.quantity || 0), 100, y);
      pdf.text(`Rs.${product.price || 0}`, 140, y);
      pdf.text(`Rs.${(product.quantity || 0) * (product.price || 0)}`, 170, y);
      y += 10;
    });
    
    pdf.line(20, y, 190, y);
    y += 10;
    pdf.text("Subtotal:", 140, y);
    pdf.text(`Rs.${data.subtotal || 0}`, 170, y);
    y += 8;
    pdf.text("Tax:", 140, y);
    pdf.text(`Rs.${data.tax || 0}`, 170, y);
    y += 8;
    pdf.setFontSize(14);
    pdf.text("Total:", 140, y);
    pdf.text(`Rs.${data.total || 0}`, 170, y);
    
    const signatureText = "Authorized Signature:";
    const signaturePosition = 240;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(signatureText, 20, signaturePosition);
    
    if (data.profile?.digital_signature_url) {
      try {
        pdf.setDrawColor(0);
        pdf.setLineWidth(0.5);
        pdf.line(20, signaturePosition + 10, 90, signaturePosition + 10);
      } catch (e) {
        console.error("Error adding signature to simplified PDF:", e);
      }
    } else {
      pdf.line(20, signaturePosition + 10, 90, signaturePosition + 10);
    }
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.businessDetails?.business_name || '', 20, signaturePosition + 15);
    
    if (data.profile?.name) {
      pdf.text(data.profile.name, 50, signaturePosition + 7);
    }
    
    if (data.businessDetails?.privacy_policy) {
      try {
        const policy = data.businessDetails.privacy_policy;
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        
        const splitText = pdf.splitTextToSize(policy, 170);
        pdf.text(splitText, 20, 260);
      } catch (e) {
        console.error("Error adding privacy policy to simplified PDF:", e);
      }
    }
    
    return pdf;
  } catch (error) {
    console.error("Even simplified PDF creation failed:", error);
    return createFallbackPDF(error);
  }
};

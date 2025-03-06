
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
  classic: classicTemplate,
  professional: professionalTemplate,
  diamond: diamondTemplate
};

// Helper function to load an image and convert it to base64
export const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    if (!url) return null;
    
    console.log("Loading image:", url);
    const fullUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${url}`;
    
    // Use fetch to get the image
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.error("Failed to load image:", response.statusText);
      return null;
    }
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => {
        console.error("Error reading file");
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
};

// Clean and normalize data to prevent null values
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
    profile: data.profile || {}
  };
  
  console.log("Sanitized invoice data:", sanitizedData);
  return sanitizedData;
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

// Preload any images needed for the PDF to avoid async issues
export const preloadImagesForPDF = async (data: InvoiceData): Promise<InvoiceData> => {
  try {
    const enhancedData = { ...data };
    
    // Preload logo if available
    if (data.businessDetails?.logo_url) {
      console.log("Preloading logo:", data.businessDetails.logo_url);
      const logoBase64 = await loadImageAsBase64(data.businessDetails.logo_url);
      if (logoBase64) {
        enhancedData.businessDetails = {
          ...data.businessDetails,
          logo_base64: logoBase64
        };
      }
    }
    
    // Preload signature if available
    if (data.profile?.digital_signature_url) {
      console.log("Preloading signature:", data.profile.digital_signature_url);
      const signatureBase64 = await loadImageAsBase64(data.profile.digital_signature_url);
      if (signatureBase64) {
        enhancedData.profile = {
          ...data.profile,
          signature_base64: signatureBase64
        };
      }
    }
    
    return enhancedData;
  } catch (error) {
    console.error("Error preloading images:", error);
    return data;
  }
};

// Try to create a PDF with error handling
export const generateInvoicePDF = async (templateName: string, data: InvoiceData): Promise<jsPDF> => {
  try {
    console.log(`Generating invoice PDF with template: ${templateName}`, data);
    
    // Make sure we have a valid template name or default to classic
    const templateKey = (templateName && templateName in templates) ? 
      templateName as keyof typeof templates : 
      'classic';
      
    console.log(`Using template: ${templateKey}`);
    const templateFn = templates[templateKey];
    
    // Sanitize data to prevent null values
    const cleanData = sanitizeInvoiceData(data);
    
    if (!cleanData.companyName && cleanData.businessDetails?.business_name) {
      // Ensure we have a company name from business details if not provided directly
      cleanData.companyName = cleanData.businessDetails.business_name;
    }
    
    // Preload any images needed for the PDF to avoid async issues
    const enhancedData = await preloadImagesForPDF(cleanData);
    
    // Attempt to generate PDF with the selected template
    let pdf: jsPDF;
    try {
      console.log(`Calling ${templateKey} template function with data:`, enhancedData);
      pdf = await templateFn(enhancedData);
      
      // Verify the PDF was actually created
      if (!pdf || !(pdf instanceof jsPDF)) {
        console.error(`PDF object was not properly created by ${templateKey} template`);
        throw new Error("PDF object was not properly created");
      }
      
      console.log("PDF successfully generated");
      
      // Add privacy policy if available
      if (enhancedData.businessDetails?.privacy_policy) {
        try {
          const policy = enhancedData.businessDetails.privacy_policy;
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          
          // Add a new page for privacy policy if it's lengthy
          if (policy.length > 500) {
            pdf.addPage();
            pdf.text("Privacy Policy", 20, 20);
            
            // Split long text into paragraphs that fit on the page
            const splitText = pdf.splitTextToSize(policy, 170);
            pdf.text(splitText, 20, 30);
          } else {
            // For shorter policies, add at the bottom of the last page
            const lastPage = pdf.getNumberOfPages();
            pdf.setPage(lastPage);
            
            const splitText = pdf.splitTextToSize(policy, 170);
            // Position at the bottom of the page
            pdf.text(splitText, 20, 270);
          }
        } catch (policyError) {
          console.error("Error adding privacy policy to PDF:", policyError);
          // Continue without the policy rather than failing
        }
      }
      
      return pdf;
    } catch (templateError) {
      console.error(`Error with ${templateKey} template:`, templateError);
      
      // If the selected template fails, try classic as fallback
      if (templateKey !== 'classic') {
        console.log("Falling back to classic template");
        try {
          pdf = await templates.classic(enhancedData);
          console.log("Fallback template (classic) succeeded");
          return pdf;
        } catch (fallbackError) {
          console.error("Fallback template also failed:", fallbackError);
          return createSimplifiedPDF(enhancedData);
        }
      } else {
        return createSimplifiedPDF(enhancedData);
      }
    }
  } catch (error) {
    console.error("Unexpected error in generateInvoicePDF:", error);
    return createSimplifiedPDF(data);
  }
};

// Create a simplified but reliable PDF as last resort
const createSimplifiedPDF = (data: InvoiceData): jsPDF => {
  try {
    console.log("Creating simplified PDF as fallback");
    const pdf = new jsPDF();
    
    // Basic header
    pdf.setFontSize(22);
    pdf.setTextColor(0, 0, 0);
    pdf.text("INVOICE", 105, 20, { align: "center" });
    
    // Add company information
    pdf.setFontSize(12);
    pdf.text(`Company: ${data.companyName || "Your Business"}`, 20, 40);
    pdf.text(`Email: ${data.email || ""}`, 20, 48);
    pdf.text(`Phone: ${data.phone || ""}`, 20, 56);
    
    // Add customer information
    pdf.text(`Customer: ${data.customerName || "Customer"}`, 20, 72);
    
    // Due Date
    if (data.dueDate) {
      let dueDateStr = "";
      try {
        dueDateStr = new Date(data.dueDate).toLocaleDateString();
      } catch (e) {
        dueDateStr = String(data.dueDate);
      }
      pdf.text(`Due Date: ${dueDateStr}`, 20, 80);
    }
    
    // Add products table header
    pdf.line(20, 90, 190, 90);
    pdf.text("Product", 22, 98);
    pdf.text("Quantity", 100, 98);
    pdf.text("Price", 140, 98);
    pdf.text("Total", 170, 98);
    pdf.line(20, 102, 190, 102);
    
    // Add products
    let y = 110;
    data.products.forEach((product) => {
      pdf.text(product.name || "Product", 22, y);
      pdf.text(String(product.quantity || 0), 100, y);
      pdf.text(`Rs.${product.price || 0}`, 140, y);
      pdf.text(`Rs.${(product.quantity || 0) * (product.price || 0)}`, 170, y);
      y += 10;
    });
    
    // Add total
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
    
    // Add signature
    if (data.profile?.signature_base64) {
      try {
        pdf.addImage(
          data.profile.signature_base64,
          'PNG', 
          20, 
          y + 20, 
          60, 
          30
        );
        pdf.setFontSize(10);
        pdf.text("Signature", 40, y + 55);
      } catch (e) {
        console.error("Error adding signature to simplified PDF:", e);
      }
    }
    
    // Add privacy policy if available
    if (data.businessDetails?.privacy_policy) {
      try {
        const policy = data.businessDetails.privacy_policy;
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        
        // Split long text into paragraphs that fit on the page
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

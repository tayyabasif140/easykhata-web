import { jsPDF } from "jspdf";
import { format } from "date-fns";

export type InvoiceData = {
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: Date;
  businessDetails?: any;
  profile?: any;
};

const loadImage = async (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";  // Important for CORS
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

const addBusinessHeader = async (doc: jsPDF, businessDetails: any, y: number) => {
  try {
    if (businessDetails?.business_logo_url) {
      const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`;
      const img = await loadImage(logoUrl);
      doc.addImage(img, 'PNG', 20, y, 40, 40);
    }
    
    if (businessDetails?.business_name) {
      doc.setFontSize(16);
      doc.text(businessDetails.business_name, 70, y + 15);
    }
    
    if (businessDetails?.business_address) {
      doc.setFontSize(10);
      doc.text(businessDetails.business_address, 70, y + 25);
    }
  } catch (error) {
    console.error('Error loading business logo:', error);
  }
  
  return y + 50;
};

const addSignature = async (doc: jsPDF, profile: any, y: number) => {
  try {
    if (profile?.digital_signature_url) {
      const signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${profile.digital_signature_url}`;
      const img = await loadImage(signatureUrl);
      doc.addImage(img, 'PNG', 20, y, 50, 20);
      doc.setFontSize(10);
      doc.text("Authorized Signature", 20, y + 25);
    }
  } catch (error) {
    console.error('Error loading signature:', error);
  }
  return y + 30;
};

export const templates = {
  modern: async (data: InvoiceData) => {
    const doc = new jsPDF();
    let y = 20;

    // Header with business details
    y = await addBusinessHeader(doc, data.businessDetails, y);

    // Invoice title
    doc.setFillColor(51, 51, 51);
    doc.rect(0, y, doc.internal.pageSize.width, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("INVOICE", 20, y + 10);
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 120, y + 10);
    y += 25;

    // Customer details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`To: ${data.customerName}`, 20, y);
    doc.text(`Company: ${data.companyName}`, 20, y + 10);
    doc.text(`Email: ${data.email}`, 20, y + 20);
    doc.text(`Phone: ${data.phone}`, 20, y + 30);
    y += 45;

    // Products table
    doc.setFillColor(240, 240, 240);
    doc.rect(20, y, 170, 10, 'F');
    doc.text("Item", 25, y + 7);
    doc.text("Qty", 100, y + 7);
    doc.text("Price", 130, y + 7);
    doc.text("Total", 160, y + 7);
    y += 15;

    data.products.forEach(product => {
      doc.text(product.name, 25, y);
      doc.text(product.quantity.toString(), 100, y);
      doc.text(`Rs.${product.price}`, 130, y);
      doc.text(`Rs.${product.quantity * product.price}`, 160, y);
      y += 10;
    });

    y += 10;
    doc.line(20, y, 190, y);
    y += 10;

    // Totals
    doc.text("Subtotal:", 130, y);
    doc.text(`Rs.${data.subtotal}`, 160, y);
    y += 10;
    doc.text("Tax:", 130, y);
    doc.text(`Rs.${data.tax}`, 160, y);
    y += 10;
    doc.setFontSize(14);
    doc.text("Total:", 130, y);
    doc.text(`Rs.${data.total}`, 160, y);
    y += 30;

    // Terms and conditions
    doc.setFontSize(10);
    doc.text("Terms and Conditions:", 20, y);
    doc.text("1. Payment is due within 30 days", 20, y + 10);
    doc.text("2. Please include invoice number on payment", 20, y + 20);
    doc.text("3. Make all checks payable to company name", 20, y + 30);
    y += 45;

    // Signature
    y = await addSignature(doc, data.profile, y);

    return doc;
  },

  professional: async (data: InvoiceData) => {
    const doc = new jsPDF();
    let y = 20;

    try {
      // Header
      if (data.businessDetails?.business_logo_url) {
        const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${data.businessDetails.business_logo_url}`;
        const img = await loadImage(logoUrl);
        doc.addImage(img, 'PNG', 20, 20, 40, 40);
      }

      // Business details on right
      doc.setFontSize(10);
      doc.text(data.businessDetails?.business_name || "", 140, 25, { align: "right" });
      doc.text(data.businessDetails?.business_address || "", 140, 35, { align: "right" });
      y += 50;

      // Invoice title
      doc.setFontSize(24);
      doc.setTextColor(44, 62, 80);
      doc.text("INVOICE", 20, y);
      y += 20;

      // Customer details in a box
      doc.setDrawColor(44, 62, 80);
      doc.setLineWidth(0.5);
      doc.rect(20, y, 170, 40);
      doc.setFontSize(12);
      doc.text("Bill To:", 25, y + 10);
      doc.setFontSize(10);
      doc.text(data.customerName, 25, y + 20);
      doc.text(data.companyName, 25, y + 30);
      y += 50;

      // Products table
      const headers = ["Item", "Quantity", "Price", "Total"];
      const columnWidths = [80, 30, 30, 30];
      
      // Table headers
      doc.setFillColor(44, 62, 80);
      doc.rect(20, y, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      let xPos = 25;
      headers.forEach((header, i) => {
        doc.text(header, xPos, y + 7);
        xPos += columnWidths[i];
      });
      y += 15;

      // Table content
      doc.setTextColor(0, 0, 0);
      data.products.forEach(product => {
        xPos = 25;
        doc.text(product.name, xPos, y);
        xPos += columnWidths[0];
        doc.text(product.quantity.toString(), xPos, y);
        xPos += columnWidths[1];
        doc.text(`Rs.${product.price}`, xPos, y);
        xPos += columnWidths[2];
        doc.text(`Rs.${product.quantity * product.price}`, xPos, y);
        y += 10;
      });

      y += 20;

      // Totals
      doc.setFontSize(12);
      doc.text("Subtotal:", 140, y);
      doc.text(`Rs.${data.subtotal}`, 170, y, { align: "right" });
      y += 10;
      doc.text("Tax:", 140, y);
      doc.text(`Rs.${data.tax}`, 170, y, { align: "right" });
      y += 10;
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text("Total:", 140, y);
      doc.text(`Rs.${data.total}`, 170, y, { align: "right" });
      y += 30;

      // Terms and Conditions
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text("Terms and Conditions", 20, y);
      y += 10;
      const terms = [
        "1. Payment is due within 30 days of invoice date",
        "2. Late payments are subject to a 2% monthly fee",
        "3. Please include invoice number in all correspondence",
        "4. This invoice is subject to our standard terms and conditions"
      ];
      terms.forEach(term => {
        doc.text(term, 20, y);
        y += 10;
      });

      // Privacy Notice
      y += 10;
      doc.text("Privacy Notice", 20, y);
      y += 10;
      doc.setFontSize(8);
      doc.text("This document contains confidential information and is intended only for the individual named.", 20, y);
      y += 20;

      // Signature
      if (data.profile?.digital_signature_url) {
        const signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${data.profile.digital_signature_url}`;
        const img = await loadImage(signatureUrl);
        doc.addImage(img, 'PNG', 20, y, 50, 20);
        doc.text("Authorized Signature", 20, y + 25);
      }
    } catch (error) {
      console.error('Error generating professional template:', error);
    }

    return doc;
  },

  classic: async (data: InvoiceData) => {
    const doc = new jsPDF();
    let y = 20;

    // Logo and business details
    y = await addBusinessHeader(doc, data.businessDetails, y);

    // Invoice header
    doc.setFontSize(24);
    doc.text("INVOICE", 105, y, { align: "center" });
    y += 20;

    // Customer details
    doc.setFontSize(12);
    doc.text("Bill To:", 20, y);
    y += 10;
    doc.text(data.customerName, 20, y);
    y += 10;
    doc.text(data.companyName, 20, y);
    y += 10;
    doc.text(data.email, 20, y);
    y += 10;
    doc.text(data.phone, 20, y);
    y += 20;

    // Products table
    doc.line(20, y, 190, y);
    y += 10;
    doc.text("Product", 20, y);
    doc.text("Qty", 100, y);
    doc.text("Price", 130, y);
    doc.text("Total", 160, y);
    y += 5;
    doc.line(20, y, 190, y);
    y += 10;

    data.products.forEach(product => {
      doc.text(product.name, 20, y);
      doc.text(product.quantity.toString(), 100, y);
      doc.text(`Rs.${product.price}`, 130, y);
      doc.text(`Rs.${product.quantity * product.price}`, 160, y);
      y += 10;
    });

    y += 10;
    doc.line(20, y, 190, y);
    y += 20;

    // Totals
    doc.text("Subtotal:", 130, y);
    doc.text(`Rs.${data.subtotal}`, 190, y, { align: "right" });
    y += 10;
    doc.text("Tax:", 130, y);
    doc.text(`Rs.${data.tax}`, 190, y, { align: "right" });
    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(44, 62, 80);
    doc.text("Total:", 130, y);
    doc.text(`Rs.${data.total}`, 190, y, { align: "right" });
    y += 30;

    // Terms and Privacy
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Terms and Conditions:", 20, y);
    y += 10;
    doc.text("1. All invoices are payable within 30 days of issue", 20, y);
    y += 10;
    doc.text("2. Any disputes must be raised within 7 days of invoice date", 20, y);
    y += 20;
    
    doc.text("Privacy Notice:", 20, y);
    y += 10;
    doc.text("This invoice contains confidential information and should be handled accordingly.", 20, y);
    y += 30;

    // Signature
    y = await addSignature(doc, data.profile, y);

    return doc;
  },

  golden: async (data: InvoiceData) => {
    const doc = new jsPDF();
    let y = 20;

    // Header with business details
    y = await addBusinessHeader(doc, data.businessDetails, y);

    // Gold accents
    doc.setFillColor(218, 165, 32); // Golden color
    doc.rect(0, y, doc.internal.pageSize.width, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("PREMIUM INVOICE", 20, y + 14);
    doc.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, 120, y + 14);
    y += 30;

    // Customer details with elegant styling
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setDrawColor(218, 165, 32);
    doc.rect(15, y - 5, 180, 50);
    doc.text("Billed To:", 20, y);
    doc.setFontSize(11);
    doc.text(data.customerName, 20, y + 10);
    doc.text(data.companyName, 20, y + 20);
    doc.text(data.email, 20, y + 30);
    doc.text(data.phone, 20, y + 40);
    y += 60;

    // Products table with golden accents
    doc.setFillColor(218, 165, 32);
    doc.rect(15, y, 180, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("Item", 20, y + 8);
    doc.text("Quantity", 100, y + 8);
    doc.text("Price", 140, y + 8);
    doc.text("Total", 170, y + 8);
    y += 20;

    // Table content
    doc.setTextColor(0, 0, 0);
    data.products.forEach(product => {
      doc.text(product.name, 20, y);
      doc.text(product.quantity.toString(), 100, y);
      doc.text(`Rs.${product.price}`, 140, y);
      doc.text(`Rs.${product.quantity * product.price}`, 170, y);
      y += 10;
    });

    y += 10;
    // Totals section with elegant styling
    doc.setDrawColor(218, 165, 32);
    doc.line(15, y, 195, y);
    y += 15;

    doc.text("Subtotal:", 140, y);
    doc.text(`Rs.${data.subtotal}`, 170, y);
    y += 10;
    doc.text("Tax:", 140, y);
    doc.text(`Rs.${data.tax}`, 170, y);
    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(218, 165, 32);
    doc.text("Total:", 140, y);
    doc.text(`Rs.${data.total}`, 170, y);
    y += 30;

    // Footer with terms and signature
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    y = await addSignature(doc, data.profile, y);

    return doc;
  },

  diamond: async (data: InvoiceData) => {
    const doc = new jsPDF();
    let y = 20;

    // Luxury header
    doc.setFillColor(72, 72, 72); // Dark gray
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    
    // Add business details with premium styling
    if (data.businessDetails?.business_logo_url) {
      const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${data.businessDetails.business_logo_url}`;
      const img = await loadImage(logoUrl);
      doc.addImage(img, 'PNG', 20, 5, 30, 30);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("DIAMOND CLASS", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("EXCLUSIVE INVOICE", 105, 30, { align: "center" });
    y += 30;

    // Customer section with premium design
    doc.setTextColor(72, 72, 72);
    doc.setFillColor(245, 245, 245);
    doc.rect(15, y, 180, 60, 'F');
    doc.setFontSize(14);
    doc.text("BILLED TO", 20, y + 15);
    doc.setFontSize(11);
    doc.text(data.customerName, 20, y + 30);
    doc.text(data.companyName, 20, y + 40);
    doc.text(`${data.email} | ${data.phone}`, 20, y + 50);
    y += 70;

    // Premium table design
    doc.setFillColor(72, 72, 72);
    doc.rect(15, y, 180, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("Description", 20, y + 10);
    doc.text("Quantity", 100, y + 10);
    doc.text("Price", 140, y + 10);
    doc.text("Amount", 170, y + 10);
    y += 20;

    // Table content with alternating backgrounds
    data.products.forEach((product, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(15, y - 5, 180, 15, 'F');
      }
      doc.setTextColor(72, 72, 72);
      doc.text(product.name, 20, y);
      doc.text(product.quantity.toString(), 100, y);
      doc.text(`Rs.${product.price}`, 140, y);
      doc.text(`Rs.${product.quantity * product.price}`, 170, y);
      y += 15;
    });

    y += 10;

    // Premium totals section
    doc.setFillColor(72, 72, 72);
    doc.rect(120, y, 75, 60, 'F');
    doc.setTextColor(255, 255, 255);
    y += 15;
    doc.text("Subtotal:", 125, y);
    doc.text(`Rs.${data.subtotal}`, 185, y, { align: "right" });
    y += 15;
    doc.text("Tax:", 125, y);
    doc.text(`Rs.${data.tax}`, 185, y, { align: "right" });
    y += 15;
    doc.setFontSize(14);
    doc.text("Total:", 125, y);
    doc.text(`Rs.${data.total}`, 185, y, { align: "right" });
    y += 30;

    // Signature section
    y = await addSignature(doc, data.profile, y);

    return doc;
  },

  funky: async (data: InvoiceData) => {
    const doc = new jsPDF();
    let y = 20;

    // Funky header with vibrant colors
    doc.setFillColor(255, 105, 180); // Hot pink
    doc.rect(0, 0, doc.internal.pageSize.width, 50, 'F');
    
    if (data.businessDetails?.business_logo_url) {
      const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${data.businessDetails.business_logo_url}`;
      const img = await loadImage(logoUrl);
      doc.addImage(img, 'PNG', 20, 5, 40, 40);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.text("FUNKY INVOICE!", 105, 30, { align: "center" });
    y += 60;

    // Colorful customer section
    doc.setFillColor(147, 112, 219); // Purple
    doc.rect(15, y - 10, 180, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("TO THE AWESOME:", 20, y);
    doc.setFontSize(12);
    doc.text(data.customerName, 20, y + 15);
    doc.text(data.companyName, 20, y + 30);
    doc.text(data.email, 20, y + 45);
    doc.text(data.phone, 20, y + 60);
    y += 80;

    // Funky table header
    const colors = ['#FF69B4', '#4169E1', '#32CD32', '#FFD700'];
    doc.setFillColor(255, 105, 180);
    doc.rect(15, y, 180, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("COOL STUFF", 20, y + 10);
    doc.text("#", 100, y + 10);
    doc.text("PRICE", 140, y + 10);
    doc.text("TOTAL", 170, y + 10);
    y += 20;

    // Funky table content
    data.products.forEach((product, index) => {
      doc.setFillColor(colors[index % colors.length]);
      doc.rect(15, y - 5, 180, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(product.name, 20, y);
      doc.text(product.quantity.toString(), 100, y);
      doc.text(`Rs.${product.price}`, 140, y);
      doc.text(`Rs.${product.quantity * product.price}`, 170, y);
      y += 15;
    });

    y += 10;

    // Funky totals
    doc.setFillColor(255, 105, 180);
    doc.rect(120, y, 75, 60, 'F');
    doc.setTextColor(255, 255, 255);
    y += 15;
    doc.text("Subtotal:", 125, y);
    doc.text(`Rs.${data.subtotal}`, 185, y, { align: "right" });
    y += 15;
    doc.text("Tax:", 125, y);
    doc.text(`Rs.${data.tax}`, 185, y, { align: "right" });
    y += 15;
    doc.setFontSize(16);
    doc.text("GRAND TOTAL:", 125, y);
    doc.text(`Rs.${data.total}`, 185, y, { align: "right" });
    y += 30;

    // Signature
    y = await addSignature(doc, data.profile, y);

    return doc;
  },

  bold: async (data: InvoiceData) => {
    const doc = new jsPDF();
    let y = 20;

    // Bold header with strong design
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, doc.internal.pageSize.width, 60, 'F');
    
    if (data.businessDetails?.business_logo_url) {
      const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${data.businessDetails.business_logo_url}`;
      const img = await loadImage(logoUrl);
      doc.addImage(img, 'PNG', 20, 10, 40, 40);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.text("INVOICE", 105, 35, { align: "center" });
    y += 70;

    // Bold customer section
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 10, 180, 70, 'F');
    doc.setFontSize(18);
    doc.text("BILL TO:", 20, y);
    doc.setFontSize(12);
    doc.text(data.customerName, 20, y + 15);
    doc.text(data.companyName, 20, y + 30);
    doc.text(data.email, 20, y + 45);
    doc.text(data.phone, 20, y + 60);
    y += 80;

    // Bold table design
    doc.setFillColor(0, 0, 0);
    doc.rect(15, y, 180, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text("ITEM", 20, y + 10);
    doc.text("QTY", 100, y + 10);
    doc.text("PRICE", 140, y + 10);
    doc.text("TOTAL", 170, y + 10);
    y += 20;

    // Table content with bold styling
    doc.setTextColor(0, 0, 0);
    data.products.forEach((product, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(240, 240, 240);
        doc.rect(15, y - 5, 180, 15, 'F');
      }
      doc.text(product.name, 20, y);
      doc.text(product.quantity.toString(), 100, y);
      doc.text(`Rs.${product.price}`, 140, y);
      doc.text(`Rs.${product.quantity * product.price}`, 170, y);
      y += 15;
    });

    y += 10;

    // Bold totals section
    doc.setFillColor(0, 0, 0);
    doc.rect(120, y, 75, 60, 'F');
    doc.setTextColor(255, 255, 255);
    y += 15;
    doc.text("Subtotal:", 125, y);
    doc.text(`Rs.${data.subtotal}`, 185, y, { align: "right" });
    y += 15;
    doc.text("Tax:", 125, y);
    doc.text(`Rs.${data.tax}`, 185, y, { align: "right" });
    y += 15;
    doc.setFontSize(14);
    doc.text("TOTAL:", 125, y);
    doc.text(`Rs.${data.total}`, 185, y, { align: "right" });
    y += 30;

    // Signature
    y = await addSignature(doc, data.profile, y);

    return doc;
  }
};

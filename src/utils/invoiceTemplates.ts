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
  }
};

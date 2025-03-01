
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
    try {
      // Create a new PDF document
      const doc = new jsPDF();
      let y = 20;
      
      // Add a professional header with gradient-like appearance
      doc.setFillColor(25, 47, 96); // Deep blue for header
      doc.rect(0, 0, doc.internal.pageSize.width, 50, 'F');
      doc.setFillColor(37, 71, 132); // Lighter blue for accent
      doc.rect(0, 50, doc.internal.pageSize.width, 5, 'F');
      
      // Add company logo and details
      if (data.businessDetails?.business_logo_url) {
        try {
          const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${data.businessDetails.business_logo_url}`;
          const img = await loadImage(logoUrl);
          doc.addImage(img, 'PNG', 15, 8, 35, 35);
        } catch (logoError) {
          console.error('Error loading logo:', logoError);
        }
      }
      
      // Business details in white text on blue background
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text(data.businessDetails?.business_name || "Your Business", 60, 20);
      doc.setFontSize(10);
      doc.text(data.businessDetails?.business_address || "", 60, 30);
      if (data.businessDetails?.business_category) {
        doc.text(data.businessDetails.business_category, 60, 40);
      }
      
      // Set starting position below the header
      y = 70;
      
      // Add "INVOICE" title with current date
      doc.setTextColor(25, 47, 96); // Match header color
      doc.setFontSize(24);
      doc.text("INVOICE", 20, y);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${format(new Date(), 'MMMM dd, yyyy')}`, 20, y + 10);
      
      // Add invoice number on right side
      doc.setFontSize(10);
      doc.text(`Invoice #: ${Math.floor(Math.random() * 10000)}`, 150, y); // Random number as placeholder
      if (data.dueDate) {
        doc.text(`Due: ${format(data.dueDate, 'MMMM dd, yyyy')}`, 150, y + 10);
      }
      
      y += 25;
      
      // Add a clean separator line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(20, y, 190, y);
      y += 15;
      
      // Customer info in a clean, well-spaced format
      doc.setFontSize(12);
      doc.setTextColor(25, 47, 96);
      doc.text("BILL TO:", 20, y);
      y += 8;
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(11);
      doc.text(data.customerName, 20, y);
      y += 7;
      if (data.companyName) {
        doc.text(data.companyName, 20, y);
        y += 7;
      }
      doc.text(data.email || "", 20, y);
      y += 7;
      doc.text(data.phone || "", 20, y);
      y += 20;
      
      // Table headers with blue background
      doc.setFillColor(25, 47, 96);
      doc.rect(20, y, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("ITEM", 25, y + 7);
      doc.text("QTY", 100, y + 7);
      doc.text("PRICE", 130, y + 7);
      doc.text("AMOUNT", 170, y + 7);
      y += 15;
      
      // Table content with alternating rows for readability
      doc.setTextColor(70, 70, 70);
      data.products.forEach((product, index) => {
        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 250); // Very light blue for even rows
          doc.rect(20, y - 5, 170, 10, 'F');
        }
        doc.text(product.name, 25, y);
        doc.text(product.quantity.toString(), 100, y);
        doc.text(`Rs.${product.price.toFixed(2)}`, 130, y);
        doc.text(`Rs.${(product.quantity * product.price).toFixed(2)}`, 170, y);
        y += 10;
      });
      
      y += 10;
      
      // Add another separator before totals
      doc.setDrawColor(220, 220, 220);
      doc.line(20, y, 190, y);
      y += 15;
      
      // Totals section with professional styling
      doc.setTextColor(70, 70, 70);
      doc.text("Subtotal:", 130, y);
      doc.setTextColor(25, 47, 96);
      doc.text(`Rs.${data.subtotal.toFixed(2)}`, 190, y, { align: "right" });
      y += 10;
      
      doc.setTextColor(70, 70, 70);
      doc.text("Tax:", 130, y);
      doc.setTextColor(25, 47, 96);
      doc.text(`Rs.${data.tax.toFixed(2)}`, 190, y, { align: "right" });
      y += 15;
      
      // Total amount highlighted for emphasis
      doc.setFillColor(25, 47, 96);
      doc.rect(120, y - 5, 70, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text("TOTAL:", 130, y + 5);
      doc.text(`Rs.${data.total.toFixed(2)}`, 190, y + 5, { align: "right" });
      y += 25;
      
      // Payment information and terms
      doc.setTextColor(25, 47, 96);
      doc.setFontSize(11);
      doc.text("Payment Details:", 20, y);
      y += 8;
      doc.setTextColor(70, 70, 70);
      doc.setFontSize(10);
      doc.text("Bank: Professional Bank Ltd", 20, y);
      y += 7;
      doc.text("Account: XXXX-XXXX-XXXX-1234", 20, y);
      y += 7;
      doc.text("SWIFT: PBXXXXXXX", 20, y);
      y += 20;
      
      // Terms and conditions
      doc.setTextColor(25, 47, 96);
      doc.setFontSize(11);
      doc.text("Terms & Conditions:", 20, y);
      y += 8;
      doc.setTextColor(70, 70, 70);
      doc.setFontSize(9);
      doc.text("1. Payment is due within 30 days", 20, y);
      y += 6;
      doc.text("2. Please include invoice number with your payment", 20, y);
      y += 6;
      doc.text("3. Contact us for any questions regarding this invoice", 20, y);
      y += 20;
      
      // Add signature if available
      try {
        if (data.profile?.digital_signature_url) {
          const signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${data.profile.digital_signature_url}`;
          const img = await loadImage(signatureUrl);
          doc.addImage(img, 'PNG', 20, y, 40, 20);
          doc.setFontSize(9);
          doc.text("Authorized Signature", 20, y + 25);
        }
      } catch (signatureError) {
        console.error('Error loading signature:', signatureError);
      }
      
      // Add a professional footer
      doc.setFillColor(25, 47, 96); 
      doc.rect(0, doc.internal.pageSize.height - 15, doc.internal.pageSize.width, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text("Thank you for your business", doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 5, { align: "center" });
      
      return doc;
    } catch (error) {
      console.error('Error generating professional invoice:', error);
      
      // Create a basic fallback template that won't fail
      const doc = new jsPDF();
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(20);
      doc.text("INVOICE", 105, 20, { align: "center" });
      
      // Add basic customer info
      doc.setFontSize(12);
      doc.text(`Customer: ${data.customerName}`, 20, 40);
      doc.text(`Email: ${data.email}`, 20, 50);
      
      // Add products in simple table
      let y = 70;
      doc.text("Products:", 20, y);
      y += 10;
      
      data.products.forEach(product => {
        doc.text(`${product.name} x${product.quantity} @ Rs.${product.price} = Rs.${product.quantity * product.price}`, 30, y);
        y += 10;
      });
      
      // Add totals
      y += 10;
      doc.text(`Subtotal: Rs.${data.subtotal}`, 20, y);
      y += 10;
      doc.text(`Tax: Rs.${data.tax}`, 20, y);
      y += 10;
      doc.setFontSize(14);
      doc.text(`Total: Rs.${data.total}`, 20, y);
      
      return doc;
    }
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

    // Totals section with bold styling
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

    // Signature section
    y = await addSignature(doc, data.profile, y);

    return doc;
  }
};

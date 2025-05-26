
import jsPDF from 'jspdf';
import { TemplateProps } from './invoiceTemplates';
import { addPrivacyPolicy } from './templates/classic/utils/privacyPolicy';
import { fetchImageAsBase64 } from './templates/classic/utils/images/conversion';

export const diamondTemplate = async (props: TemplateProps) => {
  try {
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
      logoBase64,
      signatureBase64
    } = props;

    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Set color theme
    const primaryColor = [41, 98, 255]; // RGB
    const secondaryColor = [245, 247, 250]; // Light background

    // Add header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Add logo if available
    if (logoBase64) {
      try {
        console.log("Adding logo to diamond PDF template");
        doc.addImage(logoBase64, 'PNG', 10, 5, 30, 30);
        console.log("Successfully added logo to diamond PDF template");
      } catch (e) {
        console.error("Error adding logo image to diamond template:", e);
      }
    } else if (businessDetails?.business_logo_url) {
      try {
        console.log("Fetching logo for diamond PDF template");
        let logoUrl = businessDetails.business_logo_url;
        
        if (!logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ykjtvqztcatrkinzfpov.supabase.co';
          logoUrl = `${supabaseUrl}/storage/v1/object/public/business_files/${logoUrl}`;
        }
        
        const logoBase64Data = await fetchImageAsBase64(logoUrl);
        
        if (logoBase64Data) {
          doc.addImage(logoBase64Data, 'PNG', 10, 5, 30, 30);
          console.log("Successfully added logo to diamond PDF template");
        }
      } catch (logoError) {
        console.error("Error adding logo to diamond PDF:", logoError);
      }
    }
    
    // Text-based header
    const companyNameXPos = logoBase64 || businessDetails?.business_logo_url ? 45 : 10;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(businessDetails?.business_name || 'Company Name', companyNameXPos, 20);

    // Document title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth - 60, 25);

    // Add decorative elements
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.line(10, 45, pageWidth - 10, 45);

    // Business details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let yPos = 55;
    
    doc.text('From:', 10, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(businessDetails?.business_name || '', 10, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    
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
    }

    // Reset yPos for customer details
    yPos = 55;
    
    // Customer details
    doc.text('Bill To:', pageWidth - 90, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(customerName, pageWidth - 90, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    
    if (companyName) {
      doc.text(companyName, pageWidth - 90, yPos);
      yPos += 5;
    }
    
    if (phone) {
      doc.text(`Phone: ${phone}`, pageWidth - 90, yPos);
      yPos += 5;
    }
    
    if (email) {
      doc.text(`Email: ${email}`, pageWidth - 90, yPos);
      yPos += 5;
    }

    // Invoice details with styled box
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.roundedRect(pageWidth - 90, yPos, 80, 25, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Invoice Date:', pageWidth - 85, yPos + 8);
    doc.text('Due Date:', pageWidth - 85, yPos + 18);
    
    const currentDate = new Date().toLocaleDateString();
    const formattedDueDate = dueDate ? dueDate.toLocaleDateString() : 'N/A';
    
    doc.setFont('helvetica', 'normal');
    doc.text(currentDate, pageWidth - 40, yPos + 8);
    doc.text(formattedDueDate, pageWidth - 40, yPos + 18);

    // Products table
    yPos = 110;
    
    // Table header with different style
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
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
    
    let altRow = false;
    let currentPage = 1;
    
    const startNewPage = () => {
      doc.addPage();
      currentPage++;
      // Reset position for new page
      yPos = 20;
      // Add page header
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, yPos, pageWidth - 20, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Product', 15, yPos + 7);
      doc.text('Qty', pageWidth - 85, yPos + 7);
      doc.text('Price', pageWidth - 60, yPos + 7);
      doc.text('Total', pageWidth - 30, yPos + 7);
      
      yPos += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
    };
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      
      // Check if we need a new page
      if (yPos > pageHeight - 50) {
        startNewPage();
      }
      
      if (altRow) {
        doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.rect(10, yPos, pageWidth - 20, 10, 'F');
      }
      
      doc.text(product.name, 15, yPos + 7);
      doc.text(product.quantity.toString(), pageWidth - 85, yPos + 7);
      doc.text(`${product.price.toFixed(2)}`, pageWidth - 60, yPos + 7);
      doc.text(`${(product.quantity * product.price).toFixed(2)}`, pageWidth - 30, yPos + 7);
      
      yPos += 10;
      altRow = !altRow;
    }

    // Totals - check if we need a new page
    if (yPos > pageHeight - 100) {
      startNewPage();
    }
    
    yPos += 10;
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos);
    
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', pageWidth - 80, yPos);
    doc.text(`${subtotal.toFixed(2)}`, pageWidth - 30, yPos);
    
    yPos += 10;
    
    doc.text('Tax:', pageWidth - 80, yPos);
    doc.text(`${tax.toFixed(2)}`, pageWidth - 30, yPos);
    
    yPos += 5;
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 80, yPos, pageWidth - 10, yPos);
    
    yPos += 10;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', pageWidth - 80, yPos);
    doc.text(`${total.toFixed(2)}`, pageWidth - 30, yPos);

    // Add payment details and terms first (so it's in the background)
    const paymentDetailsYPos = pageHeight - 110;
    
    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.roundedRect(10, paymentDetailsYPos, pageWidth - 20, 40, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Payment Details', 15, paymentDetailsYPos + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Thank you for your business!', 15, paymentDetailsYPos + 20);
    doc.text('Please make payment by the due date.', 15, paymentDetailsYPos + 30);

    // Add signature on top of payment details (positioned on the right side with proper spacing)
    const signaturePosition = pageHeight - 100;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text("Authorized Signature:", pageWidth - 90, signaturePosition);
    
    // Add signature image if available - positioned to be visible above the payment details
    if (signatureBase64) {
      try {
        console.log("Adding signature to diamond PDF template");
        doc.addImage(signatureBase64, 'PNG', pageWidth - 90, signaturePosition + 2, 50, 20);
        console.log("Successfully added signature to diamond PDF template");
      } catch (e) {
        console.error("Error adding signature image to diamond template:", e);
        // If signature image fails, fall back to signature line
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 90, signaturePosition + 15, pageWidth - 30, signaturePosition + 15);
      }
    } else if (profile?.digital_signature_url) {
      try {
        console.log("Fetching signature for diamond PDF template");
        let signatureUrl = profile.digital_signature_url;
        
        if (!signatureUrl.startsWith('http') && !signatureUrl.startsWith('data:')) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ykjtvqztcatrkinzfpov.supabase.co';
          signatureUrl = `${supabaseUrl}/storage/v1/object/public/business_files/${signatureUrl}`;
        }
        
        const signatureBase64Data = await fetchImageAsBase64(signatureUrl);
        
        if (signatureBase64Data) {
          doc.addImage(signatureBase64Data, 'PNG', pageWidth - 90, signaturePosition + 2, 50, 20);
          console.log("Successfully added signature to diamond PDF template");
        } else {
          // Fall back to signature line
          doc.setDrawColor(0);
          doc.setLineWidth(0.5);
          doc.line(pageWidth - 90, signaturePosition + 15, pageWidth - 30, signaturePosition + 15);
        }
      } catch (signatureError) {
        console.error("Error adding signature to diamond PDF:", signatureError);
        // Fall back to signature line
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(pageWidth - 90, signaturePosition + 15, pageWidth - 30, signaturePosition + 15);
      }
    } else {
      // Add signature line only if no image
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(pageWidth - 90, signaturePosition + 15, pageWidth - 30, signaturePosition + 15);
    }
    
    // Add only signer name if available - positioned properly under the signature
    if (profile?.name) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(profile.name, pageWidth - 65, signaturePosition + 25);
    }

    // Footer
    const footerYPos = doc.internal.pageSize.height - 10;
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1);
    doc.line(10, footerYPos - 15, pageWidth - 10, footerYPos - 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Page ${currentPage}`, 10, footerYPos);
    doc.text('Generated with Invoice Manager', pageWidth / 2, footerYPos, { align: 'center' });

    // Add privacy policy
    addPrivacyPolicy(doc, businessDetails);

    return doc;
  } catch (error) {
    console.error("Error in diamond template:", error);
    // Create a fallback simple PDF
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Invoice", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Customer: ${props.customerName || 'N/A'}`, 20, 40);
    doc.text(`Total: ${props.total || 0}`, 20, 50);
    doc.text("Sorry, there was an error generating the detailed invoice.", 20, 70);
    return doc;
  }
};

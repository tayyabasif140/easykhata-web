
import jsPDF from 'jspdf';
import { TemplateProps } from './invoiceTemplates';
import { fetchImageAsBase64 } from './templates/classic/utils/images/conversion';

export const professionalTemplate = async (props: TemplateProps) => {
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
    signatureBase64,
    isEstimate
  } = props;

  // Create a new PDF document
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Colors
  const primaryColor = [51, 102, 204]; // RGB blue
  
  // Header with business details
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  // Add logo if available
  if (logoBase64) {
    try {
      console.log("Adding logo to professional PDF template");
      doc.addImage(logoBase64, 'PNG', 10, 5, 20, 20);
      console.log("Successfully added logo to professional PDF template");
    } catch (e) {
      console.error("Error adding logo image to professional template:", e);
    }
  } else if (businessDetails?.business_logo_url) {
    try {
      console.log("Fetching logo for professional PDF template");
      let logoUrl = businessDetails.business_logo_url;
      
      if (!logoUrl.startsWith('http') && !logoUrl.startsWith('data:')) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ykjtvqztcatrkinzfpov.supabase.co';
        logoUrl = `${supabaseUrl}/storage/v1/object/public/business_files/${logoUrl}`;
      }
      
      const logoBase64Data = await fetchImageAsBase64(logoUrl);
      
      if (logoBase64Data) {
        doc.addImage(logoBase64Data, 'PNG', 10, 5, 20, 20);
        console.log("Successfully added logo to professional PDF template");
      }
    } catch (logoError) {
      console.error("Error adding logo to professional PDF:", logoError);
    }
  }
  
  // Company name in header (offset if logo is present)
  const companyNameXPos = logoBase64 || businessDetails?.business_logo_url ? 35 : 10;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(businessDetails?.business_name || 'Company Name', companyNameXPos, 20);
  
  // Document type text in header
  doc.setFontSize(16);
  doc.text(isEstimate ? 'ESTIMATE' : 'INVOICE', pageWidth - 20, 20, { align: 'right' });
  
  let yPos = 40;
  
  // Business details
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (businessDetails?.business_address) {
    const addressLines = doc.splitTextToSize(businessDetails.business_address, 100);
    addressLines.forEach((line: string) => {
      doc.text(line, 10, yPos);
      yPos += 5;
    });
  }
  
  if (businessDetails?.website) {
    doc.text(`Website: ${businessDetails.website}`, 10, yPos);
    yPos += 5;
  }
  
  if (profile?.phone_number) {
    doc.text(`Phone: ${profile.phone_number}`, 10, yPos);
    yPos += 5;
  }
  
  if (profile?.email) {
    doc.text(`Email: ${profile.email}`, 10, yPos);
    yPos += 5;
  }
  
  // Reset yPos for customer info
  yPos = 40;
  
  // Customer information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', pageWidth - 90, yPos);
  yPos += 6;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(customerName, pageWidth - 90, yPos);
  yPos += 5;
  
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
  
  // Document details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  yPos += 10;
  
  doc.text(isEstimate ? 'Estimate Date:' : 'Invoice Date:', pageWidth - 90, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date().toLocaleDateString(), pageWidth - 25, yPos, { align: 'right' });
  yPos += 7;
  
  if (dueDate) {
    doc.setFont('helvetica', 'bold');
    doc.text(isEstimate ? 'Valid Until:' : 'Due Date:', pageWidth - 90, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(dueDate.toLocaleDateString(), pageWidth - 25, yPos, { align: 'right' });
    yPos += 7;
  }
  
  // Line separator
  yPos = 90;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(10, yPos, pageWidth - 10, yPos);
  yPos += 10;
  
  // Table header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2], 0.1);
  doc.rect(10, yPos - 5, pageWidth - 20, 10, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Item', 15, yPos);
  doc.text('Description', 60, yPos);
  doc.text('Qty', pageWidth - 85, yPos, { align: 'center' });
  doc.text('Price', pageWidth - 50, yPos, { align: 'center' });
  doc.text('Total', pageWidth - 15, yPos, { align: 'right' });
  yPos += 10;
  
  // Table items
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  let currentPage = 1;
  
  const startNewPage = () => {
    doc.addPage();
    currentPage++;
    yPos = 20;
    
    // Add header for new page
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2], 0.1);
    doc.rect(10, yPos - 5, pageWidth - 20, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Item', 15, yPos);
    doc.text('Description', 60, yPos);
    doc.text('Qty', pageWidth - 85, yPos, { align: 'center' });
    doc.text('Price', pageWidth - 50, yPos, { align: 'center' });
    doc.text('Total', pageWidth - 15, yPos, { align: 'right' });
    yPos += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
  };
  
  // Alternate row colors
  let alternateRow = false;
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    // Check if we need to start a new page
    if (yPos > pageHeight - 60) {
      startNewPage();
      alternateRow = false;
    }
    
    // Draw alternate row background
    if (alternateRow) {
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPos - 5, pageWidth - 20, 10, 'F');
    }
    
    doc.text(product.name, 15, yPos);
    
    // Handle description
    if (product.description) {
      const descriptionLines = doc.splitTextToSize(product.description, 35);
      if (descriptionLines.length > 1) {
        doc.text(descriptionLines[0] + '...', 60, yPos);
      } else {
        doc.text(product.description, 60, yPos);
      }
    }
    
    doc.text(product.quantity.toString(), pageWidth - 85, yPos, { align: 'center' });
    doc.text(`${product.price.toFixed(2)}`, pageWidth - 50, yPos, { align: 'center' });
    doc.text(`${(product.quantity * product.price).toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
    
    yPos += 10;
    alternateRow = !alternateRow;
  }
  
  // Check if we need more space for totals
  if (yPos > pageHeight - 60) {
    startNewPage();
  }
  
  // Line separator
  yPos += 5;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 100, yPos, pageWidth - 10, yPos);
  yPos += 10;
  
  // Totals
  doc.text('Subtotal:', pageWidth - 100, yPos);
  doc.text(`${subtotal.toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  yPos += 7;
  
  doc.text('Tax:', pageWidth - 100, yPos);
  doc.text(`${tax.toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  yPos += 7;
  
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 100, yPos, pageWidth - 10, yPos);
  yPos += 10;
  
  // Grand total
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(pageWidth - 100, yPos - 7, 90, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pageWidth - 90, yPos);
  doc.text(`${total.toFixed(2)}`, pageWidth - 15, yPos, { align: 'right' });
  
  // Privacy Policy instead of payment terms
  yPos += 20;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Privacy Policy:', 10, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  if (businessDetails?.privacy_policy) {
    const policyText = doc.splitTextToSize(businessDetails.privacy_policy, pageWidth - 20);
    for (let i = 0; i < Math.min(policyText.length, 3); i++) {
      doc.text(policyText[i], 10, yPos);
      yPos += 5;
    }
  } else {
    doc.text('Your privacy is important to us. We protect your personal information.', 10, yPos);
  }

  // Add signature - position it above the footer
  const signaturePosition = pageHeight - 80;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text("Authorized Signature:", 10, signaturePosition);
  
  // Add signature image if available
  if (signatureBase64) {
    try {
      console.log("Adding signature to professional PDF template");
      doc.addImage(signatureBase64, 'PNG', 10, signaturePosition + 1, 50, 20);
      console.log("Successfully added signature to professional PDF template");
    } catch (e) {
      console.error("Error adding signature image to professional template:", e);
      // If signature image fails, fall back to signature line
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
    }
  } else if (profile?.digital_signature_url) {
    try {
      console.log("Fetching signature for professional PDF template");
      let signatureUrl = profile.digital_signature_url;
      
      if (!signatureUrl.startsWith('http') && !signatureUrl.startsWith('data:')) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ykjtvqztcatrkinzfpov.supabase.co';
        signatureUrl = `${supabaseUrl}/storage/v1/object/public/business_files/${signatureUrl}`;
      }
      
      const signatureBase64Data = await fetchImageAsBase64(signatureUrl);
      
      if (signatureBase64Data) {
        doc.addImage(signatureBase64Data, 'PNG', 10, signaturePosition + 1, 50, 20);
        console.log("Successfully added signature to professional PDF template");
      } else {
        // Fall back to signature line
        doc.setDrawColor(0);
        doc.setLineWidth(0.5);
        doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
      }
    } catch (signatureError) {
      console.error("Error adding signature to professional PDF:", signatureError);
      // Fall back to signature line
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
    }
  } else {
    // Add signature line only if no image
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(10, signaturePosition + 15, 80, signaturePosition + 15);
  }
  
  // Add only signer name if available
  if (profile?.name) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(profile.name, 40, signaturePosition + 25);
  }
  
  // Footer with page number
  const footerYPos = pageHeight - 10;
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, footerYPos - 5, pageWidth, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Page ${currentPage}`, 10, footerYPos + 2);
  doc.text('Thank you for your business!', pageWidth / 2, footerYPos + 2, { align: 'center' });
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - 10, footerYPos + 2, { align: 'right' });
  
  return doc;
};

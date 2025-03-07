
import jsPDF from 'jspdf';
import { TemplateProps } from '../../invoiceTemplates';
import { renderHeader } from './sections/header';
import { renderCustomerInfo } from './sections/customerInfo';
import { renderProductsTable } from './sections/productsTable';
import { renderTotals } from './sections/totals';
import { renderFooter } from './sections/footer';
import { handleError } from './utils/errorHandler';

export const createClassicPDF = (props: TemplateProps): jsPDF => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  try {
    // Define initial position
    let yPos = 20;
    
    // Render header section (company details)
    yPos = renderHeader(doc, props, yPos);
    
    // Render customer information
    yPos = renderCustomerInfo(doc, props, yPos);
    
    // Render products table
    yPos = renderProductsTable(doc, props, yPos);
    
    // Render totals section
    yPos = renderTotals(doc, props, yPos);
    
    // Render footer with signature
    renderFooter(doc, props);
    
    return doc;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return handleError(doc, props);
  }
};

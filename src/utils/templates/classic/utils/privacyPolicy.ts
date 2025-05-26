

import jsPDF from 'jspdf';

export const addPrivacyPolicy = (doc: jsPDF, businessDetails: any): void => {
  // Privacy policy is now handled in the footer section instead of here
  // This function is kept for compatibility but doesn't add privacy policy anymore
  console.log("Privacy policy is now displayed in the main content area");
};


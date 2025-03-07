
import jsPDF from 'jspdf';

export const addPrivacyPolicy = (doc: jsPDF, businessDetails: any): void => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  if (businessDetails?.privacy_policy) {
    try {
      // Check if we need a new page for privacy policy (if it's long)
      if (businessDetails.privacy_policy.length > 500) {
        doc.addPage();
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Privacy Policy', 10, 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        // Split policy text into paragraphs for readable formatting
        const policyText = doc.splitTextToSize(businessDetails.privacy_policy, pageWidth - 20);
        doc.text(policyText, 10, 30);
      } else {
        // For shorter policies, add at bottom of last page
        doc.setFontSize(8);
        doc.text('Privacy Policy:', 10, pageHeight - 30);
        const policyText = doc.splitTextToSize(businessDetails.privacy_policy, pageWidth - 20);
        doc.text(policyText, 10, pageHeight - 25);
      }
    } catch (policyError) {
      console.error("Error adding privacy policy:", policyError);
      // Continue without adding policy
    }
  }
};

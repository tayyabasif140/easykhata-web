
import jsPDF from 'jspdf';

export const addPrivacyPolicy = (doc: jsPDF, businessDetails: any): void => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  if (businessDetails?.privacy_policy) {
    try {
      // Determine if policy is long enough to warrant a new page
      const policyLength = businessDetails.privacy_policy.length;
      
      if (policyLength > 500) {
        // Add a new page for long privacy policies
        doc.addPage();
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Privacy Policy', 10, 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        // Split policy text into paragraphs for better formatting
        const policyText = doc.splitTextToSize(businessDetails.privacy_policy, pageWidth - 20);
        doc.text(policyText, 10, 30);
      } else {
        // For shorter policies, add at bottom of last page
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Privacy Policy:', 10, pageHeight - 35);
        doc.setFont('helvetica', 'normal');
        const policyText = doc.splitTextToSize(businessDetails.privacy_policy, pageWidth - 20);
        doc.text(policyText, 10, pageHeight - 30);
      }
      
      console.log("Privacy policy added successfully to the invoice");
    } catch (policyError) {
      console.error("Error adding privacy policy:", policyError);
    }
  } else {
    console.log("No privacy policy found in business details");
  }
};

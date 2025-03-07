
import { TemplateProps } from '../../invoiceTemplates';
import { createClassicPDF } from './createClassicPDF';

export const classicTemplate = async (props: TemplateProps) => {
  return createClassicPDF(props);
};

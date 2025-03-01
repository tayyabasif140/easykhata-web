import jsPDF from 'jspdf';
import { classicTemplate } from './classicTemplate';
import { professionalTemplate } from './professionalTemplate';
import { diamondTemplate } from './diamondTemplate';

export const templates = {
  classic: classicTemplate,
  professional: professionalTemplate,
  diamond: diamondTemplate
};

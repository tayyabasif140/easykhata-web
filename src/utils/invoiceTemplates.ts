
import jsPDF from 'jspdf';
import { classicTemplate } from './classicTemplate';
import { professionalTemplate } from './professionalTemplate';
import { diamondTemplate } from './diamondTemplate';

export interface TemplateProps {
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  products: {
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: Date;
  businessDetails: any;
  profile: any;
}

export interface InvoiceData {
  customerName: string;
  companyName: string;
  phone: string;
  email: string;
  products: {
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: Date;
  businessDetails: any;
  profile: any;
}

export const templates = {
  modern: classicTemplate,
  professional: professionalTemplate,
  diamond: diamondTemplate
};

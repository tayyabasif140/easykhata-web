
import Header from "@/components/Header";
import { FileText, Plus, Eye, Download, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { EditInvoiceDialog } from "@/components/EditInvoiceDialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { templates } from "@/utils/invoiceTemplates";

const AllInvoices = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const { data: invoices, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (
            name,
            company
          )
        `)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Invoice deleted successfully"
      });
      
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePreviewInvoice = async (invoice: any) => {
    try {
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      
      if (itemsError) throw itemsError;

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', invoice.customer_id)
        .single();
      
      if (customerError) throw customerError;

      const { data: businessDetails, error: businessError } = await supabase
        .from('business_details')
        .select('*')
        .eq('user_id', invoice.user_id)
        .single();
      
      if (businessError) throw businessError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', invoice.user_id)
        .single();
      
      if (profileError) throw profileError;

      const template = businessDetails?.invoice_template || 'classic';
      const templateFn = templates[template as keyof typeof templates];
      
      if (!templateFn) throw new Error('Invalid template');

      const doc = await templateFn({
        customerName: customer.name,
        companyName: customer.company || '',
        phone: customer.phone || '',
        email: customer.email,
        products: invoiceItems.map((item: any) => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          description: item.description || ''
        })),
        subtotal: invoice.total_amount,
        tax: invoice.tax_amount,
        total: invoice.total_amount + invoice.tax_amount,
        dueDate: invoice.due_date ? new Date(invoice.due_date) : undefined,
        businessDetails,
        profile
      });

      const pdfDataUrl = doc.output('dataurlstring');
      const previewWindow = window.open();
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head>
              <title>Invoice Preview - ${customer.name}</title>
              <style>
                body { margin: 0; padding: 0; }
                iframe { width: 100%; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${pdfDataUrl}"></iframe>
            </body>
          </html>
        `);
      }
    } catch (error: any) {
      console.error('Error previewing invoice:', error);
      toast({
        title: "Error",
        description: "Failed to preview invoice. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadInvoice = async (invoice: any) => {
    try {
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);
      
      if (itemsError) throw itemsError;

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', invoice.customer_id)
        .single();
      
      if (customerError) throw customerError;

      const { data: businessDetails, error: businessError } = await supabase
        .from('business_details')
        .select('*')
        .eq('user_id', invoice.user_id)
        .single();
      
      if (businessError) throw businessError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', invoice.user_id)
        .single();
      
      if (profileError) throw profileError;

      const template = businessDetails?.invoice_template || 'classic';
      const templateFn = templates[template as keyof typeof templates];
      
      if (!templateFn) throw new Error('Invalid template');

      const doc = await templateFn({
        customerName: customer.name,
        companyName: customer.company || '',
        phone: customer.phone || '',
        email: customer.email,
        products: invoiceItems.map((item: any) => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          description: item.description || ''
        })),
        subtotal: invoice.total_amount,
        tax: invoice.tax_amount,
        total: invoice.total_amount + invoice.tax_amount,
        dueDate: invoice.due_date ? new Date(invoice.due_date) : undefined,
        businessDetails,
        profile
      });

      doc.save(`invoice_${invoice.id}.pdf`);
      toast({
        title: "Success",
        description: "Invoice downloaded successfully!"
      });
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Invoices</h1>
          <CreateInvoiceDialog />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6">
            {invoices?.length ? (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <Card key={invoice.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <span className="text-lg">{invoice.customers.name}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {invoice.customers.company || 'No company'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl sm:text-2xl font-bold">Rs.{(invoice.total_amount + invoice.tax_amount).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">
                        Created: {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                      </p>
                      {invoice.due_date && (
                        <p className="text-sm text-gray-500">
                          Due: {format(new Date(invoice.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-between border-t pt-4 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full sm:w-auto"
                        onClick={() => navigate(`/invoice/${invoice.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePreviewInvoice(invoice)}
                          className="flex-1 sm:flex-none"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="flex-1 sm:flex-none"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingInvoiceId(invoice.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices yet</h3>
                <p className="text-gray-600 mb-6">Start by creating your first invoice</p>
                <CreateInvoiceDialog />
              </div>
            )}
          </div>
        </div>
      </main>

      {editingInvoiceId && (
        <EditInvoiceDialog
          open={!!editingInvoiceId}
          onOpenChange={(open) => !open && setEditingInvoiceId(null)}
          invoiceId={editingInvoiceId}
        />
      )}
    </div>
  );
};

export default AllInvoices;

import Header from "@/components/Header";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { CreateCustomerDialog } from "@/components/CreateCustomerDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Users, TrendingUp, Plus, ArrowRight, Eye, Download, Trash2, Edit2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { generateInvoicePDF } from "@/utils/invoiceTemplates";
import { format } from "date-fns";
import { useState } from "react";
import { EditInvoiceDialog } from "@/components/EditInvoiceDialog";

const Index = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const { data: invoices } = useQuery({
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
            company,
            email,
            phone
          )
        `)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: totalStats } = useQuery({
    queryKey: ['totalStats'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { totalRevenue: 0, totalInvoices: 0, totalCustomers: 0 };
      
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, tax_amount')
        .eq('user_id', userData.user.id);
      
      const { data: allInvoices } = await supabase
        .from('invoices')
        .select('id')
        .eq('user_id', userData.user.id);
      
      const { data: allCustomers } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userData.user.id);
      
      const totalRevenue = invoices?.reduce((sum, invoice) => sum + invoice.total_amount + invoice.tax_amount, 0) || 0;
      
      return {
        totalRevenue,
        totalInvoices: allInvoices?.length || 0,
        totalCustomers: allCustomers?.length || 0
      };
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
      queryClient.invalidateQueries({ queryKey: ['totalStats'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Invoice marked as paid"
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
      
      const doc = await generateInvoicePDF(template, {
        customerName: invoice.customers.name,
        companyName: invoice.customers.company || '',
        phone: invoice.customers.phone || '',
        email: invoice.customers.email,
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
              <title>Invoice Preview - ${invoice.customers.name}</title>
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
      
      const doc = await generateInvoicePDF(template, {
        customerName: invoice.customers.name,
        companyName: invoice.customers.company || '',
        phone: invoice.customers.phone || '',
        email: invoice.customers.email,
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
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Welcome to Invoice Manager
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Streamline your business with professional invoicing
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <CreateInvoiceDialog />
            <CreateCustomerDialog />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">Rs.{totalStats?.totalRevenue?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats?.totalInvoices || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats?.totalCustomers || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Customers</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/customers')}
                  className="gap-2 w-full sm:w-auto"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              {customers?.length ? (
                <div className="space-y-4">
                  {customers.map((customer) => (
                    <div key={customer.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg gap-2">
                      <div>
                        <h3 className="font-semibold">{customer.name}</h3>
                        <p className="text-sm text-gray-600">{customer.company || 'No company'}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No customers yet</p>
                  <CreateCustomerDialog />
                </div>
              )}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900">Recent Invoices</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/invoices')}
                  className="gap-2 w-full sm:w-auto"
                >
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              {invoices?.length ? (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                        <div>
                          <h3 className="font-semibold">{invoice.customers.name}</h3>
                          <p className="text-sm text-gray-600">{invoice.customers.company || 'No company'}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invoice.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.status === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <p className="text-lg font-bold">Rs.{(invoice.total_amount + invoice.tax_amount).toLocaleString()}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
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
                          {invoice.status !== 'paid' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              className="flex-1 sm:flex-none"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteInvoice(invoice.id)}
                            className="flex-1 sm:flex-none"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No invoices yet</p>
                  <CreateInvoiceDialog />
                </div>
              )}
            </div>
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

export default Index;

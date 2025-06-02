
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { EditInvoiceDialog } from "@/components/EditInvoiceDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF } from "@/utils/invoiceTemplates";
import { Edit, Download, Trash2 } from "lucide-react";

const AllInvoices = () => {
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter, customerFilter],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers (id, name, company, email)
        `)
        .eq('user_id', userData.user.id);

      if (statusFilter !== "all") {
        if (statusFilter === "near_delayed") {
          const nearDelayedDate = new Date();
          nearDelayedDate.setDate(nearDelayedDate.getDate() + 3);
          query = query
            .eq('status', 'unpaid')
            .lte('due_date', nearDelayedDate.toISOString().split('T')[0]);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      if (customerFilter !== "all") {
        query = query.eq('customer_id', customerFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userData.user.id);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: businessDetails } = useQuery({
    queryKey: ['businessDetails'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from('business_details')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Invoice status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      });
    }
  });

  const generateInvoicePDFHandler = async (invoice: any) => {
    try {
      const { data: invoiceItems, error } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (error) throw error;

      const template = businessDetails?.invoice_template || 'classic';
      
      const invoiceData = {
        customerName: invoice.customers?.name || 'Customer',
        companyName: invoice.customers?.company || '',
        phone: invoice.customers?.phone || '',
        email: invoice.customers?.email || '',
        products: invoiceItems.map(item => ({
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
        profile,
        logoBase64: null,
        signatureBase64: null,
        isEstimate: false
      };
      
      const doc = await generateInvoicePDF(template, invoiceData);
      if (doc) {
        const fileName = `invoice_${invoice.id}.pdf`;
        doc.save(fileName);
        
        toast({
          title: "Success",
          description: "Invoice PDF downloaded successfully",
        });
      }
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate invoice PDF",
        variant: "destructive",
      });
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, dueDate: string | null) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status === 'unpaid';
    
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-600">Paid</Badge>;
      case 'unpaid':
        return <Badge variant="secondary">Unpaid</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getFilteredStats = () => {
    if (!invoices) return { total: 0, amount: 0 };
    
    const total = invoices.length;
    const amount = invoices.reduce((sum, invoice) => sum + (invoice.total_amount + invoice.tax_amount), 0);
    
    return { total, amount };
  };

  const stats = getFilteredStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">Loading invoices...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">All Invoices</h1>
          <CreateInvoiceDialog />
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="near_delayed">Near Delayed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customers?.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Invoices</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">Rs.{stats.amount.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total Amount</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          {invoices && invoices.length > 0 ? (
            invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Invoice #{invoice.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {invoice.customers?.name}
                      {invoice.customers?.company && ` - ${invoice.customers.company}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invoice.status, invoice.due_date)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-2xl font-bold">
                        Rs.{(invoice.total_amount + invoice.tax_amount).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                      {invoice.due_date && (
                        <p className="text-sm text-gray-500">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select
                        value={invoice.status}
                        onValueChange={(status) => updateInvoiceStatus.mutate({ invoiceId: invoice.id, status })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditInvoiceId(invoice.id)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateInvoicePDFHandler(invoice)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteInvoice(invoice.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-4">No invoices found</p>
                <CreateInvoiceDialog />
              </CardContent>
            </Card>
          )}
        </div>

        {editInvoiceId && (
          <EditInvoiceDialog
            open={!!editInvoiceId}
            onOpenChange={(open) => !open && setEditInvoiceId(null)}
            invoiceId={editInvoiceId}
          />
        )}
      </main>
    </div>
  );
};

export default AllInvoices;

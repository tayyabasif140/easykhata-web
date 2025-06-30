import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF } from "@/utils/invoiceTemplates";
import { EditInvoiceDialog } from "@/components/EditInvoiceDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Calendar,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";

const AllInvoices = () => {
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (name, company, email)
        `)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      
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

  const handleGenerateInvoicePDF = async (invoice: any) => {
    try {
      // Fetch invoice items
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

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status })
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Invoice marked as ${status}`,
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, dueDate?: string | null) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status === 'unpaid';
    
    if (isOverdue) return <Badge variant="destructive">Overdue</Badge>;
    
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

  const filteredInvoices = invoices?.filter(invoice => {
    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "overdue") {
        if (!(invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status === 'unpaid')) {
          return false;
        }
      } else if (statusFilter === "upcoming") {
        const dueDate = new Date(invoice.due_date);
        const currentDate = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(currentDate.getDate() + 3);
        
        if (!(invoice.status === 'unpaid' && dueDate > currentDate && dueDate <= threeDaysLater)) {
          return false;
        }
      } else if (invoice.status !== statusFilter) {
        return false;
      }
    }

    // Customer filter
    if (customerFilter !== "all" && invoice.customer_id !== customerFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== "all") {
      const invoiceDate = new Date(invoice.created_at);
      const currentDate = new Date();
      
      if (dateFilter === "thisMonth") {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        if (!(invoiceDate >= startOfMonth && invoiceDate <= endOfMonth)) {
          return false;
        }
      } else if (dateFilter === "lastMonth") {
        const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
        
        if (!(invoiceDate >= startOfLastMonth && invoiceDate <= endOfLastMonth)) {
          return false;
        }
      } else if (dateFilter === "thisYear") {
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
        const endOfYear = new Date(currentDate.getFullYear(), 11, 31);
        
        if (!(invoiceDate >= startOfYear && invoiceDate <= endOfYear)) {
          return false;
        }
      }
    }

    return true;
  });

  const invoiceStats = {
    total: filteredInvoices?.length || 0,
    paid: filteredInvoices?.filter(inv => inv.status === 'paid').length || 0,
    unpaid: filteredInvoices?.filter(inv => inv.status === 'unpaid').length || 0,
    overdue: filteredInvoices?.filter(inv => 
      inv.due_date && new Date(inv.due_date) < new Date() && inv.status === 'unpaid'
    ).length || 0,
    upcoming: filteredInvoices?.filter(inv => {
      if (inv.status !== 'unpaid' || !inv.due_date) return false;
      const dueDate = new Date(inv.due_date);
      const currentDate = new Date();
      const threeDaysLater = new Date();
      threeDaysLater.setDate(currentDate.getDate() + 3);
      return dueDate > currentDate && dueDate <= threeDaysLater;
    }).length || 0,
    totalValue: filteredInvoices?.reduce((sum, inv) => 
      sum + inv.total_amount + inv.tax_amount, 0
    ) || 0,
    paidValue: filteredInvoices?.filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total_amount + inv.tax_amount, 0) || 0,
    unpaidValue: filteredInvoices?.filter(inv => inv.status === 'unpaid')
      .reduce((sum, inv) => sum + inv.total_amount + inv.tax_amount, 0) || 0
  };

  if (isLoadingInvoices) {
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          </div>
          <CreateInvoiceDialog />
        </div>

        {/* Filters Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Filter invoices by status, customer, or date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="upcoming">Due Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Customer</label>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers?.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.company ? `(${customer.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                    <SelectItem value="thisYear">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoiceStats.total}</div>
              <p className="text-xs text-muted-foreground">
                Rs. {invoiceStats.totalValue.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{invoiceStats.paid}</div>
              <p className="text-xs text-muted-foreground">
                Rs. {invoiceStats.paidValue.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Unpaid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{invoiceStats.unpaid}</div>
              <p className="text-xs text-muted-foreground">
                Rs. {invoiceStats.unpaidValue.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Need Attention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{invoiceStats.overdue}</div>
              <p className="text-xs text-muted-foreground">
                {invoiceStats.upcoming} invoices due soon
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6">
          {filteredInvoices && filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        Invoice #{invoice.id.slice(0, 8)}
                      </CardTitle>
                      {getStatusBadge(invoice.status, invoice.due_date)}
                    </div>
                    <CardDescription>
                      {invoice.customers?.name}
                      {invoice.customers?.company && ` - ${invoice.customers.company}`}
                    </CardDescription>
                  </div>
                  {invoice.status === 'unpaid' && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Paid
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => updateInvoiceStatus(invoice.id, 'cancelled')}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 mt-2">
                    <div className="space-y-1">
                      <p className="text-2xl font-bold">
                        Rs.{(invoice.total_amount + invoice.tax_amount).toFixed(2)}
                      </p>
                      <div className="flex flex-col text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" /> Created: {new Date(invoice.created_at).toLocaleDateString()}
                        </span>
                        {invoice.due_date && (
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" /> Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center">
                          <User className="w-4 h-4 mr-1" /> {invoice.customers?.email || "No email"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-start sm:justify-end items-center gap-2 mt-4 sm:mt-0">
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
                        onClick={() => handleGenerateInvoicePDF(invoice)}
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
                  
                  {/* Warning for overdue or upcoming */}
                  {invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status === 'unpaid' && (
                    <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-md flex items-center">
                      <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                      <span className="text-sm">
                        This invoice is overdue by {Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))} days.
                      </span>
                    </div>
                  )}
                  
                  {invoice.due_date && invoice.status === 'unpaid' && (() => {
                    const dueDate = new Date(invoice.due_date);
                    const currentDate = new Date();
                    const threeDaysLater = new Date();
                    threeDaysLater.setDate(currentDate.getDate() + 3);
                    
                    if (dueDate > currentDate && dueDate <= threeDaysLater) {
                      const daysLeft = Math.ceil((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div className="mt-4 p-3 bg-amber-50 text-amber-800 rounded-md flex items-center">
                          <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                          <span className="text-sm">
                            Payment is due in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}.
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
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

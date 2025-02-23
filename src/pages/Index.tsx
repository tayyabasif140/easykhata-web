import { Header } from "@/components/Header";
import { FileText, ChartBar, Package, UserPlus, Plus, TrendingUp, Clock, CheckCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { CreateCustomerDialog } from "@/components/CreateCustomerDialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<'1D' | '30D' | '1Y' | '5Y'>('30D');

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

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (
            name
          )
        `)
        .eq('user_id', userData.user.id);
      if (error) throw error;
      return data;
    }
  });

  const { data: businessTip } = useQuery({
    queryKey: ['businessTip'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('generate-business-tips');
      return data.tip;
    },
    refetchInterval: 1000 * 60 * 60, // Refresh every hour
  });

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId)
        .eq('user_id', userData.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
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
        description: error.message,
        variant: "destructive",
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
        description: "Invoice marked as paid",
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const totalPaidInvoices = invoices?.reduce((sum, invoice) => 
    invoice.status === 'paid' ? sum + Number(invoice.total_amount) : sum, 0
  ) || 0;

  const totalUnpaidInvoices = invoices?.reduce((sum, invoice) => 
    invoice.status === 'unpaid' ? sum + Number(invoice.total_amount) : sum, 0
  ) || 0;

  const calculateSalesData = () => {
    if (!invoices?.length) return [];
    
    const now = new Date();
    const data: { [key: string]: number } = {};
    
    let startDate = new Date();
    let format: 'hour' | 'day' | 'month' | 'year';
    
    switch(timeRange) {
      case '1D':
        startDate.setDate(now.getDate() - 1);
        format = 'hour';
        break;
      case '30D':
        startDate.setDate(now.getDate() - 30);
        format = 'day';
        break;
      case '1Y':
        startDate.setFullYear(now.getFullYear() - 1);
        format = 'month';
        break;
      case '5Y':
        startDate.setFullYear(now.getFullYear() - 5);
        format = 'year';
        break;
    }

    if (format === 'hour') {
      for (let i = 0; i < 24; i++) {
        data[`${i}:00`] = 0;
      }
    }

    invoices
      .filter(invoice => {
        const date = new Date(invoice.created_at);
        return invoice.status === 'paid' && date >= startDate;
      })
      .forEach(invoice => {
        const date = new Date(invoice.created_at);
        let key;
        switch(format) {
          case 'hour':
            key = `${date.getHours()}:00`;
            break;
          case 'day':
            key = date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
            break;
          case 'month':
            key = date.toLocaleDateString('default', { month: 'short' });
            break;
          case 'year':
            key = date.getFullYear().toString();
            break;
        }
        data[key] = (data[key] || 0) + Number(invoice.total_amount);
      });

    return Object.entries(data)
      .map(([label, amount]) => ({
        label,
        amount: parseFloat(amount.toFixed(2))
      }));
  };

  const salesData = calculateSalesData();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="mt-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-lg bg-green-50 border border-green-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Paid Invoices
                </h3>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  Rs.{totalPaidInvoices.toLocaleString()}
                </p>
              </div>
              <div className="p-6 rounded-lg bg-red-50 border border-red-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Unpaid Invoices
                </h3>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  Rs.{totalUnpaidInvoices.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {businessTip && (
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Business Tip of the Day</h3>
            <p className="text-blue-800">{businessTip}</p>
          </div>
        )}

        <div className="mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div 
              onClick={() => document.querySelector<HTMLButtonElement>('[data-create-invoice]')?.click()} 
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer"
            >
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice</h3>
              <p className="text-gray-600">Create and manage your invoices easily</p>
            </div>
            <div 
              onClick={() => navigate('/reports')} 
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer"
            >
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
                <ChartBar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Report</h3>
              <p className="text-gray-600">View detailed financial reports and analytics</p>
            </div>
            <div 
              onClick={() => navigate('/inventory')} 
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer"
            >
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory</h3>
              <p className="text-gray-600">Track and manage your product stock</p>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
            <CreateCustomerDialog />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              {customers?.length ? (
                <div className="divide-y">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="py-4 flex justify-between items-center hover:bg-gray-50 px-4 -mx-4 transition-colors"
                    >
                      <div className="cursor-pointer" onClick={() => navigate(`/customer/${customer.id}`)}>
                        <h3 className="font-medium">{customer.name}</h3>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">Total Outstanding</p>
                          <p className="text-sm text-red-600">Rs.{customer.total_unpaid?.toLocaleString() || '0'}</p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => handleDeleteCustomer(customer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No customers yet</h3>
                  <p className="text-gray-600 mb-4">Start by adding your first customer</p>
                  <Button className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Customer
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Invoices</h2>
            <CreateInvoiceDialog />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              {invoices?.length ? (
                <div className="divide-y">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="py-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Invoice #{invoice.id.slice(0, 8)}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(invoice.created_at).toLocaleDateString()} • 
                          <span className="ml-2">{invoice.customers?.name}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">Rs.{invoice.total_amount.toLocaleString()}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {invoice.status === 'unpaid' && (
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="destructive" 
                            size="icon"
                            onClick={() => handleDeleteInvoice(invoice.id)}
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices yet</h3>
                  <p className="text-gray-600 mb-4">Start by creating your first invoice</p>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Invoice
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Sales Overview</h3>
            <div className="flex gap-2">
              <Button
                variant={timeRange === '1D' ? 'default' : 'outline'}
                onClick={() => setTimeRange('1D')}
              >
                1 Day
              </Button>
              <Button
                variant={timeRange === '30D' ? 'default' : 'outline'}
                onClick={() => setTimeRange('30D')}
              >
                30 Days
              </Button>
              <Button
                variant={timeRange === '1Y' ? 'default' : 'outline'}
                onClick={() => setTimeRange('1Y')}
              >
                1 Year
              </Button>
              <Button
                variant={timeRange === '5Y' ? 'default' : 'outline'}
                onClick={() => setTimeRange('5Y')}
              >
                5 Years
              </Button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

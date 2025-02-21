import { Header } from "@/components/Header";
import { FileText, ChartBar, Package, UserPlus, Plus, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";

const Index = () => {
  // Fetch customers data
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  // Fetch invoices data
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*');
      if (error) throw error;
      return data;
    }
  });

  // Calculate totals from actual data
  const totalPaidInvoices = invoices?.reduce((sum, invoice) => 
    invoice.status === 'paid' ? sum + Number(invoice.total_amount) : sum, 0
  ) || 0;

  const totalUnpaidInvoices = invoices?.reduce((sum, invoice) => 
    invoice.status === 'unpaid' ? sum + Number(invoice.total_amount) : sum, 0
  ) || 0;

  // Calculate monthly sales data from actual invoices
  const calculateMonthlySales = () => {
    if (!invoices) return [];
    
    const monthlyData = {};
    invoices.forEach(invoice => {
      const date = new Date(invoice.created_at);
      const monthKey = date.toLocaleString('default', { month: 'short' });
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + Number(invoice.total_amount);
    });

    return Object.entries(monthlyData).map(([month, sales]) => ({
      month,
      sales
    }));
  };

  const salesData = calculateMonthlySales();

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

        <div className="mt-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer">
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Invoice</h3>
              <p className="text-gray-600">Create and manage your invoices easily</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer">
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
                <ChartBar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Report</h3>
              <p className="text-gray-600">View detailed financial reports and analytics</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer">
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
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Customer
            </Button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              {customers?.length ? (
                <div className="divide-y">
                  {customers.map((customer) => (
                    <div key={customer.id} className="py-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{customer.name}</h3>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Total Outstanding</p>
                        <p className="text-sm text-red-600">Rs.{customer.total_unpaid?.toLocaleString() || '0'}</p>
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
                        <p className="text-sm text-gray-600">{new Date(invoice.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Rs.{invoice.total_amount.toLocaleString()}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {invoice.status}
                        </span>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Business Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Profit</p>
                  <p className="text-2xl font-semibold text-gray-900">Rs.{totalPaidInvoices.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-semibold text-gray-900">{invoices?.length || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Amount</p>
                  <p className="text-2xl font-semibold text-gray-900">Rs.{totalUnpaidInvoices.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          
          {salesData.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Sales Overview</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;

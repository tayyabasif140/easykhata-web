
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building, Mail, Phone, FileText } from "lucide-react";
import { BackButton } from "@/components/BackButton";

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();

  const { data: customer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: invoices } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_items (*)
        `)
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const totalPaid = invoices?.reduce((sum, invoice) => 
    invoice.status === 'paid' ? sum + Number(invoice.total_amount) : sum, 0
  ) || 0;

  const totalUnpaid = invoices?.reduce((sum, invoice) => 
    invoice.status === 'unpaid' ? sum + Number(invoice.total_amount) : sum, 0
  ) || 0;

  const monthlyData = invoices?.reduce((acc: any, invoice) => {
    const date = new Date(invoice.created_at);
    const month = date.toLocaleString('default', { month: 'short' });
    acc[month] = (acc[month] || 0) + Number(invoice.total_amount);
    return acc;
  }, {});

  const chartData = monthlyData ? Object.entries(monthlyData).map(([month, amount]) => ({
    month,
    amount
  })) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <BackButton className="mb-4" />
        
        {customer && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center text-gray-600">
                      <Building className="w-4 h-4 mr-2" />
                      {customer.company || 'No company specified'}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      {customer.email}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {customer.phone || 'No phone specified'}
                    </div>
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col items-end">
                  <div className="text-sm text-gray-600">Customer ID</div>
                  <div className="text-lg font-mono">{customer.id.slice(0, 8)}</div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Paid Invoices</h2>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  Rs.{totalPaid.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Unpaid Invoices</h2>
                <p className="mt-2 text-3xl font-bold text-red-600">
                  Rs.{totalUnpaid.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Invoice History</h2>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6">
                  {invoices?.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices yet</h3>
                      <p className="text-gray-600">This customer hasn't been invoiced yet</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {invoices?.map((invoice) => (
                        <div key={invoice.id} className="py-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium">Invoice #{invoice.id.slice(0, 8)}</h3>
                              <p className="text-sm text-gray-600">
                                {new Date(invoice.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                Rs.{Number(invoice.total_amount).toLocaleString()}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                invoice.status === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {invoice.status}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">Items:</p>
                            {invoice.invoice_items.map((item: any) => (
                              <p key={item.id} className="text-sm text-gray-600 ml-4">
                                • {item.product_name} (Qty: {item.quantity}) - Rs.{Number(item.total).toLocaleString()}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Customer Overview</h2>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Revenue</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

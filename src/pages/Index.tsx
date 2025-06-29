import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Calculator } from "lucide-react";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { CreateEstimateDialog } from "@/components/CreateEstimateDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  id: string;
  type: 'invoice' | 'estimate';
  total_amount: number;
  status: string;
  customers?: {
    name: string;
  };
}

export default function Index() {
  const navigate = useNavigate();
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showEstimateDialog, setShowEstimateDialog] = useState(false);

  const { data: recentTransactions, isLoading } = useQuery({
    queryKey: ['recentTransactions'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total_amount, status, created_at, customer_id')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: estimates } = await supabase
        .from('estimates')
        .select('id, total_amount, status, created_at, customer_id')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: customers } = await supabase
        .from('customers')
        .select('id, name')
        .in('id', [...(invoices?.map(i => i.customer_id) || []), ...(estimates?.map(e => e.customer_id) || [])]);

      const customerMap = customers?.reduce((acc, customer) => {
        acc[customer.id] = customer;
        return acc;
      }, {});

      const combinedTransactions = [
        ...(invoices?.map(invoice => ({
          ...invoice,
          type: 'invoice',
          customers: customerMap?.[invoice.customer_id]
        })) || []),
        ...(estimates?.map(estimate => ({
          ...estimate,
          type: 'estimate',
          customers: customerMap?.[estimate.customer_id]
        })) || [])
      ];

      combinedTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return combinedTransactions.slice(0, 5) as Transaction[];
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Revenue</CardTitle>
              <CardDescription>Total income generated</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">Rs. 120,000</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open Invoices</CardTitle>
              <CardDescription>Invoices pending payment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">Rs. 30,000</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New Customers</CardTitle>
              <CardDescription>Customers added this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">12</div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Chart */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Sales Performance</CardTitle>
              <CardDescription>Monthly sales trend</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for chart */}
              <div className="h-48 bg-gray-100 rounded-md flex items-center justify-center text-gray-500">
                Sales Chart Placeholder
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowInvoiceDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Invoice
              </Button>
              <Button 
                onClick={() => setShowEstimateDialog(true)}
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Estimate
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {recentTransactions?.map((transaction) => (
                <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${
                        transaction.type === 'invoice' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {transaction.type === 'invoice' ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <Calculator className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.type === 'invoice' ? 'Invoice' : 'Estimate'} #{transaction.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.customers?.name || 'Unknown Customer'} • Rs.{transaction.total_amount}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'unpaid'
                          ? 'bg-red-100 text-red-800'
                          : transaction.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (transaction.type === 'invoice') {
                            navigate(`/all-invoices`);
                          } else {
                            navigate(`/estimates`);
                          }
                        }}
                      >
                        Details →
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Invoice Dialog */}
        <CreateInvoiceDialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog} />

        {/* Estimate Dialog */}
        <CreateEstimateDialog open={showEstimateDialog} onOpenChange={setShowEstimateDialog} />
      </main>
    </div>
  );
}

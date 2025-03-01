import { Header } from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, TrendingDown, Users, Receipt, 
  DollarSign, Package, ArrowUpRight, ArrowDownRight, CheckCircle
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const Reports = () => {
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .eq('user_id', userData.user.id);
      if (error) throw error;
      return data;
    }
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory').select('*');
      if (error) throw error;
      return data;
    }
  });

  const totalRevenue = invoices?.reduce((sum, invoice) => 
    invoice.status === 'paid' ? sum + Number(invoice.total_amount) : sum, 0
  ) || 0;

  const totalUnpaid = invoices?.reduce((sum, invoice) => 
    invoice.status === 'unpaid' ? sum + Number(invoice.total_amount) : sum, 0
  ) || 0;

  const monthlyData = invoices?.reduce((acc: any, invoice) => {
    const month = new Date(invoice.created_at).toLocaleString('default', { month: 'short' });
    if (!acc[month]) acc[month] = 0;
    if (invoice.status === 'paid') {
      acc[month] += Number(invoice.total_amount);
    }
    return acc;
  }, {});

  const chartData = Object.entries(monthlyData || {}).map(([month, amount]) => ({
    month,
    amount,
  }));

  const pieData = [
    { name: 'Paid', value: invoices?.filter(i => i.status === 'paid').length || 0 },
    { name: 'Unpaid', value: invoices?.filter(i => i.status === 'unpaid').length || 0 },
  ];

  const COLORS = ['#22c55e', '#ef4444'];
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Add mutation for marking invoices as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', invoiceId)
        .eq('user_id', userData.user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: "Success",
        description: "Invoice marked as paid",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle mark as paid
  const handleMarkAsPaid = (invoiceId: string) => {
    markAsPaidMutation.mutate(invoiceId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-gray-600 mt-1">Track your business performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">Rs.{totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-gray-500">+12.5% from last month</p>
                </div>
                <div className="bg-green-50 p-2 rounded-full">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Unpaid Invoices
              </CardTitle>
              <Receipt className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">Rs.{totalUnpaid.toLocaleString()}</div>
                  <p className="text-xs text-gray-500">{pieData[1].value} invoices pending</p>
                </div>
                <div className="bg-red-50 p-2 rounded-full">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Active Customers
              </CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {new Set(invoices?.map(i => i.customer_id)).size || 0}
                  </div>
                  <p className="text-xs text-gray-500">+2 this month</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-full">
                  <ArrowUpRight className="h-4 w-4 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Low Stock Items
              </CardTitle>
              <Package className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {inventory?.filter(item => item.quantity < 5).length || 0}
                  </div>
                  <p className="text-xs text-gray-500">Products need restock</p>
                </div>
                <div className="bg-yellow-50 p-2 rounded-full">
                  <ArrowDownRight className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add a list of recent invoices with mark as paid button */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Invoices</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices?.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.customers?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Rs.{Number(invoice.total_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.status === 'paid' ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Paid
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {invoice.status === 'unpaid' && (
                        <Button 
                          variant="success"
                          size="sm"
                          onClick={() => handleMarkAsPaid(invoice.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#0ea5e9" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;

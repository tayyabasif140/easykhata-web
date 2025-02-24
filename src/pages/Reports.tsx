
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
  DollarSign, Package, ArrowUpRight, ArrowDownRight 
} from "lucide-react";

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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

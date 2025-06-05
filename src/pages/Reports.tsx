
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BackButton } from "@/components/BackButton";

const Reports = () => {
  const { data: invoiceStats } = useQuery({
    queryKey: ['invoice-stats'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('status, total_amount, tax_amount, created_at')
        .eq('user_id', userData.user.id);
      
      if (error) throw error;

      const totalRevenue = invoices.reduce((sum, invoice) => 
        invoice.status === 'paid' ? sum + invoice.total_amount + invoice.tax_amount : sum, 0
      );

      const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
      const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid').length;
      const cancelledInvoices = invoices.filter(inv => inv.status === 'cancelled').length;

      const monthlyData = invoices.reduce((acc: any, invoice) => {
        if (invoice.status === 'paid') {
          const month = new Date(invoice.created_at).toLocaleString('default', { month: 'short' });
          acc[month] = (acc[month] || 0) + invoice.total_amount + invoice.tax_amount;
        }
        return acc;
      }, {});

      const chartData = Object.entries(monthlyData).map(([month, amount]) => ({
        month,
        revenue: amount
      }));

      return {
        totalRevenue,
        totalInvoices: invoices.length,
        paidInvoices,
        unpaidInvoices,
        cancelledInvoices,
        chartData,
        statusData: [
          { name: 'Paid', value: paidInvoices, color: '#10B981' },
          { name: 'Unpaid', value: unpaidInvoices, color: '#F59E0B' },
          { name: 'Cancelled', value: cancelledInvoices, color: '#EF4444' }
        ]
      };
    }
  });

  const { data: estimateStats } = useQuery({
    queryKey: ['estimate-stats'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data: estimates, error } = await supabase
        .from('estimates')
        .select('status, total_amount, tax_amount, created_at, valid_until')
        .eq('user_id', userData.user.id);
      
      if (error) throw error;

      const totalEstimates = estimates.length;
      const draftEstimates = estimates.filter(est => est.status === 'draft').length;
      const sentEstimates = estimates.filter(est => est.status === 'sent').length;
      const acceptedEstimates = estimates.filter(est => est.status === 'accepted').length;
      const rejectedEstimates = estimates.filter(est => est.status === 'rejected').length;
      
      const expiredEstimates = estimates.filter(est => 
        est.valid_until && new Date(est.valid_until) < new Date()
      ).length;

      const totalEstimateValue = estimates.reduce((sum, estimate) => 
        sum + estimate.total_amount + estimate.tax_amount, 0
      );

      const monthlyEstimateData = estimates.reduce((acc: any, estimate) => {
        const month = new Date(estimate.created_at).toLocaleString('default', { month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});

      const estimateChartData = Object.entries(monthlyEstimateData).map(([month, count]) => ({
        month,
        estimates: count
      }));

      return {
        totalEstimates,
        draftEstimates,
        sentEstimates,
        acceptedEstimates,
        rejectedEstimates,
        expiredEstimates,
        totalEstimateValue,
        estimateChartData,
        estimateStatusData: [
          { name: 'Draft', value: draftEstimates, color: '#6B7280' },
          { name: 'Sent', value: sentEstimates, color: '#3B82F6' },
          { name: 'Accepted', value: acceptedEstimates, color: '#10B981' },
          { name: 'Rejected', value: rejectedEstimates, color: '#EF4444' },
          { name: 'Expired', value: expiredEstimates, color: '#F59E0B' }
        ]
      };
    }
  });

  const { data: customerStats } = useQuery({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data: customers, error } = await supabase
        .from('customers')
        .select('total_paid, total_unpaid')
        .eq('user_id', userData.user.id);
      
      if (error) throw error;

      const totalCustomers = customers.length;
      const totalReceivables = customers.reduce((sum, customer) => sum + (customer.total_unpaid || 0), 0);

      return {
        totalCustomers,
        totalReceivables
      };
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <BackButton />
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs.{(invoiceStats?.totalRevenue || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From paid invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoiceStats?.totalInvoices || 0}</div>
              <p className="text-xs text-muted-foreground">
                <Badge variant="secondary" className="mr-1">{invoiceStats?.paidInvoices || 0} Paid</Badge>
                <Badge variant="outline">{invoiceStats?.unpaidInvoices || 0} Unpaid</Badge>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estimateStats?.totalEstimates || 0}</div>
              <p className="text-xs text-muted-foreground">
                <Badge variant="secondary" className="mr-1">{estimateStats?.acceptedEstimates || 0} Accepted</Badge>
                <Badge variant="outline">{estimateStats?.expiredEstimates || 0} Expired</Badge>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs.{(customerStats?.totalReceivables || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">From {customerStats?.totalCustomers || 0} customers</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>Revenue from paid invoices by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={invoiceStats?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`Rs.${value}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Invoice Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status Distribution</CardTitle>
              <CardDescription>Breakdown of invoice statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={invoiceStats?.statusData || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {invoiceStats?.statusData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Estimates Created Monthly */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Estimates</CardTitle>
              <CardDescription>Number of estimates created by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={estimateStats?.estimateChartData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}`, 'Estimates']} />
                  <Bar dataKey="estimates" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Estimate Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Estimate Status Distribution</CardTitle>
              <CardDescription>Breakdown of estimate statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={estimateStats?.estimateStatusData?.filter(item => item.value > 0) || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {estimateStats?.estimateStatusData?.filter(item => item.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Estimate Statistics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Estimate Details</CardTitle>
            <CardDescription>Comprehensive breakdown of estimate data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{estimateStats?.draftEstimates || 0}</div>
                <p className="text-sm text-gray-500">Draft</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{estimateStats?.sentEstimates || 0}</div>
                <p className="text-sm text-gray-500">Sent</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{estimateStats?.acceptedEstimates || 0}</div>
                <p className="text-sm text-gray-500">Accepted</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{estimateStats?.rejectedEstimates || 0}</div>
                <p className="text-sm text-gray-500">Rejected</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{estimateStats?.expiredEstimates || 0}</div>
                <p className="text-sm text-gray-500">Expired</p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Rs.{(estimateStats?.totalEstimateValue || 0).toFixed(2)}</div>
                <p className="text-sm text-gray-500">Total Estimate Value</p>
                <p className="text-xs text-gray-400 mt-1">
                  (Note: Estimates are not included in revenue calculations)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;

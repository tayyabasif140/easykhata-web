import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Receipt,
  Calculator, 
  Plus, 
  ArrowRight,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { CreateEstimateDialog } from "@/components/CreateEstimateDialog";
import SetupWizard from "@/components/SetupWizard";
import { format } from "date-fns";

const Index = () => {
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isEstimateDialogOpen, setIsEstimateDialogOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
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
      if (error) {
        console.error('Error fetching business details:', error);
        return null;
      }
      return data;
    }
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      // Fetch invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, status')
        .eq('user_id', userData.user.id);

      // Fetch customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', userData.user.id);

      // Fetch inventory items
      const { data: inventory } = await supabase
        .from('inventory')
        .select('quantity, price')
        .eq('user_id', userData.user.id);

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('total_amount')
        .eq('user_id', userData.user.id);

      const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0;
      const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
      const paidAmount = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      const unpaidAmount = totalRevenue - paidAmount;
      const inventoryValue = inventory?.reduce((sum, item) => sum + (item.quantity * Number(item.price)), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, exp) => sum + Number(exp.total_amount), 0) || 0;

      return {
        totalRevenue,
        paidAmount,
        unpaidAmount,
        customersCount: customers?.length || 0,
        inventoryValue,
        totalExpenses
      };
    }
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          customers (
            name
          )
        `)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return invoices || [];
    }
  });

  if (!profile || !businessDetails) {
    return <SetupWizard />;
  }

  const quickActions = [
    {
      title: "Create Invoice",
      description: "Generate a new invoice for your customers",
      icon: FileText,
      color: "bg-blue-500",
      action: () => setIsInvoiceDialogOpen(true)
    },
    {
      title: "Create Estimate",
      description: "Prepare quotes and estimates",
      icon: Calculator,
      color: "bg-green-500", 
      action: () => setIsEstimateDialogOpen(true)
    },
    {
      title: "View Customers",
      description: "Manage your customer database",
      icon: Users,
      color: "bg-purple-500",
      link: "/customers"
    },
    {
      title: "Check Inventory",
      description: "Monitor your product inventory",
      icon: Package,
      color: "bg-orange-500",
      link: "/inventory"
    },
    {
      title: "Manage Expenses",
      description: "Track business expenses and suppliers",
      icon: Receipt,
      color: "bg-red-500",
      link: "/expenses"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-16 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Section */}
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {profile?.full_name || "User"}!
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your business today.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${statsLoading ? "..." : stats?.totalRevenue?.toFixed(2) || "0.00"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unpaid Amount</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ${statsLoading ? "..." : stats?.unpaidAmount?.toFixed(2) || "0.00"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : stats?.customersCount || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  ${statsLoading ? "..." : stats?.totalExpenses?.toFixed(2) || "0.00"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action, index) => (
                  <div key={index} className="group cursor-pointer">
                    {action.link ? (
                      <Link to={action.link}>
                        <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className={`p-3 rounded-lg ${action.color} text-white mr-4`}>
                            <action.icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{action.title}</h3>
                            <p className="text-sm text-gray-600">{action.description}</p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                        </div>
                      </Link>
                    ) : (
                      <div 
                        onClick={action.action}
                        className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className={`p-3 rounded-lg ${action.color} text-white mr-4`}>
                          <action.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{action.title}</h3>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Link to="/invoices">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions?.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No transactions yet</p>
                ) : (
                  recentTransactions?.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full mr-3">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{transaction.customers?.name || 'Unknown Customer'}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${transaction.total_amount.toFixed(2)}</p>
                        <Badge 
                          variant={transaction.status === 'paid' ? 'default' : 'secondary'}
                          className={transaction.status === 'paid' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateInvoiceDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
      />

      <CreateEstimateDialog
        open={isEstimateDialogOpen}
        onOpenChange={setIsEstimateDialogOpen}
      />
    </div>
  );
};

export default Index;

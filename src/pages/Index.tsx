import { Header } from "@/components/Header";
import { FileText, ChartBar, Package, UserPlus, Plus, IndianRupee, Download, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateInvoiceDialog } from "@/components/CreateInvoiceDialog";
import { CreateCustomerDialog } from "@/components/CreateCustomerDialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxPayment {
  id: string;
  amount: number;
  description: string;
  payment_date: string;
  user_id: string;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  growth: number;
}

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState<'1D' | '30D' | '1Y' | '5Y'>('30D');
  const [showTaxDialog, setShowTaxDialog] = useState(false);
  const [taxAmount, setTaxAmount] = useState('');
  const [taxDescription, setTaxDescription] = useState('');
  const [taxDate, setTaxDate] = useState<Date>();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

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

  const { data: taxPayments } = useQuery({
    queryKey: ['taxPayments'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tax_payments')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as TaxPayment[];
    }
  });

  const handleDownloadInvoice = async (invoice: any) => {
    const { data } = await supabase.storage
      .from('invoices')
      .download(`invoice_${invoice.id}.pdf`);
    
    if (data) {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoice.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const addTaxPayment = useMutation({
    mutationFn: async (payment: { amount: number; description: string; payment_date: Date }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tax_payments')
        .insert([{
          ...payment,
          user_id: userData.user.id
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxPayments'] });
      setShowTaxDialog(false);
      setTaxAmount('');
      setTaxDescription('');
      setTaxDate(undefined);
      toast({
        title: "Success",
        description: "Tax payment recorded successfully",
      });
    }
  });

  const calculateGrowthData = (): MonthlyData[] => {
    if (!invoices?.length) return [];
    
    const monthlyData: { [key: string]: MonthlyData } = {};
    
    invoices.forEach(invoice => {
      const date = new Date(invoice.created_at);
      const monthYear = date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          month: monthYear,
          revenue: 0,
          expenses: 0,
          growth: 0
        };
      }
      
      if (invoice.status === 'paid') {
        monthlyData[monthYear].revenue += Number(invoice.total_amount);
      }
    });

    // Calculate growth percentage
    const months = Object.values(monthlyData);
    months.forEach((month, index) => {
      if (index > 0) {
        const prevRevenue = months[index - 1].revenue;
        month.growth = prevRevenue ? ((month.revenue - prevRevenue) / prevRevenue) * 100 : 0;
      }
    });

    return months;
  };

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

            <div 
              onClick={() => setShowTaxDialog(true)} 
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-primary/30 transition-colors group cursor-pointer"
            >
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors mb-4">
                <IndianRupee className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tax</h3>
              <p className="text-gray-600">Record and track your tax payments</p>
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
            <div className="flex gap-2">
              {selectedInvoices.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    selectedInvoices.forEach(id => {
                      const invoice = invoices?.find(inv => inv.id === id);
                      if (invoice) handleDownloadInvoice(invoice);
                    });
                  }}
                >
                  Download Selected
                </Button>
              )}
              <CreateInvoiceDialog />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              {invoices?.length ? (
                <div className="divide-y">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="py-4 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInvoices([...selectedInvoices, invoice.id]);
                            } else {
                              setSelectedInvoices(selectedInvoices.filter(id => id !== invoice.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <div>
                          <h3 className="font-medium">Invoice #{invoice.id.slice(0, 8)}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(invoice.created_at).toLocaleDateString()} • 
                            <span className="ml-2">{invoice.customers?.name}</span>
                          </p>
                        </div>
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
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownloadInvoice(invoice)}
                          >
                            <Download className="h-4 w-4" />
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

        <div className="mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={calculateGrowthData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="growth" stroke="#22c55e" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tax Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taxPayments?.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Rs.{payment.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">{new Date(payment.payment_date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm text-gray-600">{payment.description}</p>
                    </div>
                  ))}
                  <Button
                    onClick={() => {
                      setShowTaxDialog(true);
                    }}
                    className="w-full"
                  >
                    Record Tax Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tax Dialog */}
        <Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Tax Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!taxDate || !taxAmount) return;
              
              addTaxPayment.mutate({
                amount: parseFloat(taxAmount),
                description: taxDescription,
                payment_date: taxDate
              });
            }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={taxDescription}
                    onChange={(e) => setTaxDescription(e.target.value)}
                    placeholder="Enter description"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !taxDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {taxDate ? format(taxDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={taxDate}
                        onSelect={setTaxDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button type="submit" className="w-full">
                  Record Payment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Invoice Details Dialog */}
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-500">Invoice Number</h3>
                    <p>#{selectedInvoice.id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-500">Date</h3>
                    <p>{new Date(selectedInvoice.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-500">Customer</h3>
                    <p>{selectedInvoice.customers?.name}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-500">Status</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-sm ${
                      selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-500 mb-2">Items</h3>
                  <div className="space-y-2">
                    {selectedInvoice.invoice_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between py-2 border-b">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                        </div>
                        <p className="font-medium">Rs.{item.total.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <p className="text-gray-500">Subtotal</p>
                    <p>Rs.{selectedInvoice.total_amount.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-gray-500">Tax</p>
                    <p>Rs.{selectedInvoice.tax_amount.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between font-medium">
                    <p>Total</p>
                    <p>Rs.{(Number(selectedInvoice.total_amount) + Number(selectedInvoice.tax_amount)).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadInvoice(selectedInvoice)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Index;


import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Building, Mail, Phone, FileText, ChevronDown } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <BackButton className="mb-4" />
        
        {customer && (
          <>
            <Card className="mb-8 overflow-hidden border-none shadow-sm">
              <CardHeader className="bg-white pb-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900">{customer.name}</CardTitle>
                    <CardDescription className="mt-2">
                      <div className="space-y-2">
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
                    </CardDescription>
                  </div>
                  <div className="mt-4 md:mt-0 md:text-right">
                    <div className="text-sm text-gray-600">Customer ID</div>
                    <div className="text-lg font-mono tracking-tight">{customer.id.slice(0, 8)}</div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Paid Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    Rs.{totalPaid.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold">Unpaid Invoices</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">
                    Rs.{totalUnpaid.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mb-8">
              <Tabs defaultValue="all" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Invoice History</h2>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="paid">Paid</TabsTrigger>
                    <TabsTrigger value="unpaid">Unpaid</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="all" className="mt-0">
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      {invoices?.length === 0 ? (
                        <div className="text-center py-12 bg-white">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices yet</h3>
                          <p className="text-gray-600">This customer hasn't been invoiced yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoices?.map((invoice) => (
                                <TableRow 
                                  key={invoice.id} 
                                  className="cursor-pointer hover:bg-gray-50 group"
                                >
                                  <TableCell className="font-medium">
                                    #{invoice.id.slice(0, 8)}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(invoice.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <span>{invoice.invoice_items.length} items</span>
                                      <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-hover:rotate-180" />
                                    </div>
                                    <div className="hidden group-hover:block mt-2 pl-4 border-l-2 border-gray-200">
                                      {invoice.invoice_items.map((item: any) => (
                                        <p key={item.id} className="text-sm text-gray-600 py-0.5">
                                          {item.product_name} x {item.quantity} - Rs.{Number(item.total).toLocaleString()}
                                        </p>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      invoice.status === 'paid' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {invoice.status}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    Rs.{Number(invoice.total_amount).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="paid" className="mt-0">
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      {!invoices?.some(invoice => invoice.status === 'paid') ? (
                        <div className="text-center py-12 bg-white">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No paid invoices</h3>
                          <p className="text-gray-600">This customer doesn't have any paid invoices yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoices?.filter(invoice => invoice.status === 'paid').map((invoice) => (
                                <TableRow 
                                  key={invoice.id} 
                                  className="cursor-pointer hover:bg-gray-50 group"
                                >
                                  <TableCell className="font-medium">
                                    #{invoice.id.slice(0, 8)}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(invoice.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <span>{invoice.invoice_items.length} items</span>
                                      <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-hover:rotate-180" />
                                    </div>
                                    <div className="hidden group-hover:block mt-2 pl-4 border-l-2 border-gray-200">
                                      {invoice.invoice_items.map((item: any) => (
                                        <p key={item.id} className="text-sm text-gray-600 py-0.5">
                                          {item.product_name} x {item.quantity} - Rs.{Number(item.total).toLocaleString()}
                                        </p>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      {invoice.status}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    Rs.{Number(invoice.total_amount).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="unpaid" className="mt-0">
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      {!invoices?.some(invoice => invoice.status === 'unpaid') ? (
                        <div className="text-center py-12 bg-white">
                          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">No unpaid invoices</h3>
                          <p className="text-gray-600">This customer doesn't have any unpaid invoices</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Invoice #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoices?.filter(invoice => invoice.status === 'unpaid').map((invoice) => (
                                <TableRow 
                                  key={invoice.id} 
                                  className="cursor-pointer hover:bg-gray-50 group"
                                >
                                  <TableCell className="font-medium">
                                    #{invoice.id.slice(0, 8)}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(invoice.created_at).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <span>{invoice.invoice_items.length} items</span>
                                      <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-hover:rotate-180" />
                                    </div>
                                    <div className="hidden group-hover:block mt-2 pl-4 border-l-2 border-gray-200">
                                      {invoice.invoice_items.map((item: any) => (
                                        <p key={item.id} className="text-sm text-gray-600 py-0.5">
                                          {item.product_name} x {item.quantity} - Rs.{Number(item.total).toLocaleString()}
                                        </p>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      {invoice.status}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    Rs.{Number(invoice.total_amount).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="mt-8">
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">Monthly Revenue</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Phone, Building, FileText, Calculator } from "lucide-react";
import { BackButton } from "@/components/BackButton";

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      if (!id) throw new Error('Customer ID is required');
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: invoices } = useQuery({
    queryKey: ['customer-invoices', id],
    queryFn: async () => {
      if (!id) throw new Error('Customer ID is required');
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: estimates } = useQuery({
    queryKey: ['customer-estimates', id],
    queryFn: async () => {
      if (!id) throw new Error('Customer ID is required');
      
      const { data, error } = await supabase
        .from('estimates')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const getStatusBadge = (status: string, dueDate?: string | null, isEstimate?: boolean) => {
    if (isEstimate) {
      const isExpired = dueDate && new Date(dueDate) < new Date();
      if (isExpired) return <Badge variant="destructive">Expired</Badge>;
      
      switch (status) {
        case 'draft': return <Badge variant="secondary">Draft</Badge>;
        case 'sent': return <Badge variant="default">Sent</Badge>;
        case 'accepted': return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
        case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
      }
    } else {
      const isOverdue = dueDate && new Date(dueDate) < new Date() && status === 'unpaid';
      if (isOverdue) return <Badge variant="destructive">Overdue</Badge>;
      
      switch (status) {
        case 'paid': return <Badge variant="default" className="bg-green-600">Paid</Badge>;
        case 'unpaid': return <Badge variant="secondary">Unpaid</Badge>;
        case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">Loading customer details...</div>
          </div>
        </main>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Customer not found</h2>
            <Button onClick={() => navigate('/customers')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <BackButton />
          <h1 className="text-3xl font-bold text-gray-900">Customer Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer Information */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{customer.name}</h3>
                  {customer.company && (
                    <p className="text-gray-600">{customer.company}</p>
                  )}
                </div>
                
                {customer.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{customer.email}</span>
                  </div>
                )}
                
                {customer.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{customer.phone}</span>
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total Paid:</span>
                    <span className="font-semibold text-green-600">
                      Rs.{(customer.total_paid || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Total Unpaid:</span>
                    <span className="font-semibold text-red-600">
                      Rs.{(customer.total_unpaid || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium text-gray-800">Total Business:</span>
                    <span className="font-bold text-lg">
                      Rs.{((customer.total_paid || 0) + (customer.total_unpaid || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Invoice History ({invoices?.length || 0})
                </CardTitle>
                <CardDescription>
                  Complete history of all invoices for this customer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invoices && invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice) => (
                      <div 
                        key={invoice.id} 
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">Invoice #{invoice.id.slice(0, 8)}</h4>
                            {getStatusBadge(invoice.status, invoice.due_date)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Created: {new Date(invoice.created_at).toLocaleDateString()}</span>
                            {invoice.due_date && (
                              <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            Rs.{(invoice.total_amount + invoice.tax_amount).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Subtotal: Rs.{invoice.total_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No invoices found for this customer
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Estimates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Estimate History ({estimates?.length || 0})
                </CardTitle>
                <CardDescription>
                  Complete history of all estimates for this customer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {estimates && estimates.length > 0 ? (
                  <div className="space-y-4">
                    {estimates.map((estimate) => (
                      <div 
                        key={estimate.id} 
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">Estimate #{estimate.id.slice(0, 8)}</h4>
                            {getStatusBadge(estimate.status, estimate.valid_until, true)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Created: {new Date(estimate.created_at).toLocaleDateString()}</span>
                            {estimate.valid_until && (
                              <span>Valid until: {new Date(estimate.valid_until).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            Rs.{(estimate.total_amount + estimate.tax_amount).toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Subtotal: Rs.{estimate.total_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No estimates found for this customer
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDetails;

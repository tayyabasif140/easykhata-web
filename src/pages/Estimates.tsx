
import Header from "@/components/Header";
import { FileText, Plus, Eye, Download, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateEstimateDialog } from "@/components/CreateEstimateDialog";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { templates } from "@/utils/invoiceTemplates";

const Estimates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: estimates } = useQuery({
    queryKey: ['estimates'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          customers (
            name,
            company
          )
        `)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleDeleteEstimate = async (estimateId: string) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', estimateId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Estimate deleted successfully"
      });
      
      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handlePreviewEstimate = async (estimate: any) => {
    try {
      const { data: estimateItems, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', estimate.id);
      
      if (itemsError) throw itemsError;

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', estimate.customer_id)
        .single();
      
      if (customerError) throw customerError;

      const { data: businessDetails, error: businessError } = await supabase
        .from('business_details')
        .select('*')
        .eq('user_id', estimate.user_id)
        .single();
      
      if (businessError) throw businessError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', estimate.user_id)
        .single();
      
      if (profileError) throw profileError;

      const template = businessDetails?.invoice_template || 'classic';
      const templateFn = templates[template as keyof typeof templates];
      
      if (!templateFn) throw new Error('Invalid template');

      const doc = await templateFn({
        customerName: customer.name,
        companyName: customer.company || '',
        phone: customer.phone || '',
        email: customer.email,
        products: estimateItems.map((item: any) => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal: estimate.total_amount,
        tax: estimate.tax_amount,
        total: estimate.total_amount + estimate.tax_amount,
        dueDate: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
        businessDetails,
        profile,
        isEstimate: true
      });

      const pdfDataUrl = doc.output('dataurlstring');
      const previewWindow = window.open();
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head>
              <title>Estimate Preview - ${customer.name}</title>
              <style>
                body { margin: 0; padding: 0; }
                iframe { width: 100%; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${pdfDataUrl}"></iframe>
            </body>
          </html>
        `);
      }
    } catch (error: any) {
      console.error('Error previewing estimate:', error);
      toast({
        title: "Error",
        description: "Failed to preview estimate. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadEstimate = async (estimate: any) => {
    try {
      const { data: estimateItems, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', estimate.id);
      
      if (itemsError) throw itemsError;

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', estimate.customer_id)
        .single();
      
      if (customerError) throw customerError;

      const { data: businessDetails, error: businessError } = await supabase
        .from('business_details')
        .select('*')
        .eq('user_id', estimate.user_id)
        .single();
      
      if (businessError) throw businessError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', estimate.user_id)
        .single();
      
      if (profileError) throw profileError;

      const template = businessDetails?.invoice_template || 'classic';
      const templateFn = templates[template as keyof typeof templates];
      
      if (!templateFn) throw new Error('Invalid template');

      const doc = await templateFn({
        customerName: customer.name,
        companyName: customer.company || '',
        phone: customer.phone || '',
        email: customer.email,
        products: estimateItems.map((item: any) => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal: estimate.total_amount,
        tax: estimate.tax_amount,
        total: estimate.total_amount + estimate.tax_amount,
        dueDate: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
        businessDetails,
        profile,
        isEstimate: true
      });

      doc.save(`estimate_${estimate.id}.pdf`);
      toast({
        title: "Success",
        description: "Estimate downloaded successfully!"
      });
    } catch (error: any) {
      console.error('Error downloading estimate:', error);
      toast({
        title: "Error",
        description: "Failed to download estimate. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Estimates</h1>
          <CreateEstimateDialog />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6">
            {estimates?.length ? (
              <div className="space-y-4">
                {estimates.map((estimate) => (
                  <Card key={estimate.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <span className="text-lg">{estimate.customers.name}</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Estimate
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {estimate.customers.company || 'No company'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xl sm:text-2xl font-bold">Rs.{(estimate.total_amount + estimate.tax_amount).toLocaleString()}</p>
                      <p className="text-sm text-gray-500">
                        Created: {format(new Date(estimate.created_at), 'MMM d, yyyy')}
                      </p>
                      {estimate.valid_until && (
                        <p className="text-sm text-gray-500">
                          Valid Until: {format(new Date(estimate.valid_until), 'MMM d, yyyy')}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-between border-t pt-4 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full sm:w-auto"
                        onClick={() => navigate(`/estimate/${estimate.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handlePreviewEstimate(estimate)}
                          className="flex-1 sm:flex-none"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDownloadEstimate(estimate)}
                          className="flex-1 sm:flex-none"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 sm:flex-none"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteEstimate(estimate.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No estimates yet</h3>
                <p className="text-gray-600 mb-6">Start by creating your first estimate</p>
                <CreateEstimateDialog />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Estimates;

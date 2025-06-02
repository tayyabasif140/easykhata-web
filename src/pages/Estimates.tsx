import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CreateEstimateDialog } from "@/components/CreateEstimateDialog";
import { EditEstimateDialog } from "@/components/EditEstimateDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF } from "@/utils/invoiceTemplates";
import { Edit, Download, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/BackButton";

const Estimates = () => {
  const [editEstimateId, setEditEstimateId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: estimates, isLoading } = useQuery({
    queryKey: ['estimates'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          customers (name, company, email)
        `)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
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
      if (error) throw error;
      return data;
    }
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const generateEstimatePDF = async (estimate: any) => {
    try {
      // Fetch estimate items
      const { data: estimateItems, error } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', estimate.id);

      if (error) throw error;

      const template = businessDetails?.invoice_template || 'classic';
      
      const estimateData = {
        customerName: estimate.customers?.name || 'Customer',
        companyName: estimate.customers?.company || '',
        phone: estimate.customers?.phone || '',
        email: estimate.customers?.email || '',
        products: estimateItems.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          description: item.description || ''
        })),
        subtotal: estimate.total_amount,
        tax: estimate.tax_amount,
        total: estimate.total_amount + estimate.tax_amount,
        dueDate: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
        businessDetails,
        profile,
        logoBase64: null,
        signatureBase64: null,
        isEstimate: true
      };
      
      const doc = await generateInvoicePDF(template, estimateData);
      if (doc) {
        const fileName = `estimate_${estimate.id}.pdf`;
        doc.save(fileName);
        
        toast({
          title: "Success",
          description: "Estimate PDF downloaded successfully",
        });
      }
    } catch (error) {
      console.error("Error generating estimate PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate estimate PDF",
        variant: "destructive",
      });
    }
  };

  const deleteEstimate = async (estimateId: string) => {
    try {
      const { error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', estimateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Estimate deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['estimates'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete estimate",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, validUntil: string | null) => {
    const isExpired = validUntil && new Date(validUntil) < new Date();
    
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'sent':
        return <Badge variant="default">Sent</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">Loading estimates...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
          </div>
          <CreateEstimateDialog />
        </div>

        <div className="grid gap-6">
          {estimates && estimates.length > 0 ? (
            estimates.map((estimate) => (
              <Card key={estimate.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Estimate #{estimate.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {estimate.customers?.name}
                      {estimate.customers?.company && ` - ${estimate.customers.company}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(estimate.status, estimate.valid_until)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-2xl font-bold">
                        Rs.{(estimate.total_amount + estimate.tax_amount).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(estimate.created_at).toLocaleDateString()}
                      </p>
                      {estimate.valid_until && (
                        <p className="text-sm text-gray-500">
                          Valid until: {new Date(estimate.valid_until).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditEstimateId(estimate.id)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateEstimatePDF(estimate)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteEstimate(estimate.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-4">No estimates found</p>
                <CreateEstimateDialog />
              </CardContent>
            </Card>
          )}
        </div>

        {editEstimateId && (
          <EditEstimateDialog
            open={!!editEstimateId}
            onOpenChange={(open) => !open && setEditEstimateId(null)}
            estimateId={editEstimateId}
          />
        )}
      </main>
    </div>
  );
};

export default Estimates;

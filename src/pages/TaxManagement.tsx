
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import { BackButton } from "@/components/BackButton";

interface TaxConfiguration {
  id: string;
  name: string;
  rate: number;
  description?: string;
}

const TaxManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTax, setNewTax] = useState({
    name: "",
    rate: 0,
    description: ""
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

  const taxConfigurations: TaxConfiguration[] = businessDetails?.tax_configuration || [];

  const updateTaxConfiguration = useMutation({
    mutationFn: async (newConfigurations: TaxConfiguration[]) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('business_details')
        .upsert({
          user_id: userData.user.id,
          business_name: businessDetails?.business_name || 'Business',
          tax_configuration: newConfigurations
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessDetails'] });
      toast({
        title: "Success",
        description: "Tax configuration updated successfully",
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

  const handleAddTax = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTax.name.trim() || newTax.rate <= 0) {
      toast({
        title: "Error",
        description: "Please enter valid tax name and rate",
        variant: "destructive",
      });
      return;
    }

    const newConfiguration: TaxConfiguration = {
      id: Date.now().toString(),
      name: newTax.name,
      rate: newTax.rate,
      description: newTax.description
    };

    const updatedConfigurations = [...taxConfigurations, newConfiguration];
    updateTaxConfiguration.mutate(updatedConfigurations);
    setNewTax({ name: "", rate: 0, description: "" });
  };

  const handleDeleteTax = (taxId: string) => {
    const updatedConfigurations = taxConfigurations.filter(tax => tax.id !== taxId);
    updateTaxConfiguration.mutate(updatedConfigurations);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex items-center gap-4 mb-8">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tax Management</h1>
            <p className="text-gray-600">Configure taxes for your invoices and estimates</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add New Tax</CardTitle>
              <CardDescription>
                Create tax configurations that can be applied to invoices and estimates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTax} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tax_name">Tax Name</Label>
                    <Input
                      id="tax_name"
                      value={newTax.name}
                      onChange={(e) => setNewTax(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      placeholder="e.g., VAT, Sales Tax"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newTax.rate}
                      onChange={(e) => setNewTax(prev => ({
                        ...prev,
                        rate: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="Enter tax rate"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tax_description">Description (Optional)</Label>
                    <Input
                      id="tax_description"
                      value={newTax.description}
                      onChange={(e) => setNewTax(prev => ({
                        ...prev,
                        description: e.target.value
                      }))}
                      placeholder="Tax description"
                    />
                  </div>
                </div>
                
                <Button type="submit" disabled={updateTaxConfiguration.isPending} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {updateTaxConfiguration.isPending ? "Adding..." : "Add Tax"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Configurations</CardTitle>
              <CardDescription>
                Manage your existing tax configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {taxConfigurations.length > 0 ? (
                <div className="space-y-4">
                  {taxConfigurations.map((tax) => (
                    <div key={tax.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{tax.name}</h3>
                        <p className="text-sm text-gray-500">Rate: {tax.rate}%</p>
                        {tax.description && (
                          <p className="text-sm text-gray-400">{tax.description}</p>
                        )}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTax(tax.id)}
                        disabled={updateTaxConfiguration.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No tax configurations created yet. Add one above to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TaxManagement;

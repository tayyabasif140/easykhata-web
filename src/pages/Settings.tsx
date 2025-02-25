
import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";

const INVOICE_TEMPLATES = [
  { id: 'classic', name: 'Classic Template', preview: '/classic-template.png' },
  { id: 'modern', name: 'Modern Template', preview: '/modern-template.png' },
  { id: 'professional', name: 'Professional Template', preview: '/professional-template.png' },
];

interface TaxConfig {
  name: string;
  rate: number;
  enabled: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [taxes, setTaxes] = useState<TaxConfig[]>([
    { name: '', rate: 0, enabled: true }
  ]);

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

  const updateBusinessDetails = useMutation({
    mutationFn: async (updates: any) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('business_details')
        .update(updates)
        .eq('user_id', userData.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessDetails'] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    }
  });

  const addTaxField = () => {
    setTaxes([...taxes, { name: '', rate: 0, enabled: true }]);
  };

  const removeTaxField = (index: number) => {
    setTaxes(taxes.filter((_, i) => i !== index));
  };

  const updateTax = (index: number, field: keyof TaxConfig, value: string | number | boolean) => {
    const newTaxes = [...taxes];
    newTaxes[index] = { ...newTaxes[index], [field]: value };
    setTaxes(newTaxes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBusinessDetails.mutateAsync({
        tax_configuration: taxes
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Default Invoice Template</CardTitle>
              <CardDescription>
                Select your preferred invoice template that will be used by default when creating new invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {INVOICE_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      businessDetails?.invoice_template === template.id ? 'border-primary bg-primary/5' : 'hover:border-gray-400'
                    }`}
                    onClick={() => updateBusinessDetails.mutate({ invoice_template: template.id })}
                  >
                    <div className="aspect-video bg-gray-100 rounded mb-2">
                      <img
                        src={template.preview}
                        alt={template.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <p className="text-sm text-center font-medium">{template.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Configuration</CardTitle>
              <CardDescription>
                Configure different types of taxes that can be applied to your invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {taxes.map((tax, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-1 space-y-2">
                      <Label>Tax Name</Label>
                      <Input
                        value={tax.name}
                        onChange={(e) => updateTax(index, 'name', e.target.value)}
                        placeholder="e.g., GST, VAT"
                        required
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Rate (%)</Label>
                      <Input
                        type="number"
                        value={tax.rate}
                        onChange={(e) => updateTax(index, 'rate', parseFloat(e.target.value))}
                        min="0"
                        max="100"
                        required
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Enabled</Label>
                      <div className="pt-2">
                        <Switch
                          checked={tax.enabled}
                          onCheckedChange={(checked) => updateTax(index, 'enabled', checked)}
                        />
                      </div>
                    </div>
                    {taxes.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeTaxField(index)}
                        className="mt-8"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addTaxField}>
                  Add Tax Type
                </Button>
                <div className="flex justify-end">
                  <Button type="submit">Save Changes</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

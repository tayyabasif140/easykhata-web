import { useState } from "react";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [taxes, setTaxes] = useState<Array<{ name: string; rate: number; enabled: boolean; }>>([]);

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
      const result = data;
      if (result?.tax_configuration) {
        setTaxes(result.tax_configuration);
      }
      return result;
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <Tabs defaultValue="templates">
          <TabsList className="mb-8">
            <TabsTrigger value="templates">Invoice Templates</TabsTrigger>
            <TabsTrigger value="taxes">Tax Configuration</TabsTrigger>
            <TabsTrigger value="general">General Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Templates</CardTitle>
                <CardDescription>
                  Select your default invoice template
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
          </TabsContent>

          <TabsContent value="taxes">
            <Card>
              <CardHeader>
                <CardTitle>Tax Configuration</CardTitle>
                <CardDescription>
                  Configure tax rates and types for your invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taxes.map((tax, index) => (
                    <div key={index} className="flex gap-4 items-center">
                      <div className="flex-1">
                        <Label>Tax Name</Label>
                        <Input
                          value={tax.name}
                          onChange={(e) => {
                            const newTaxes = [...taxes];
                            newTaxes[index].name = e.target.value;
                            setTaxes(newTaxes);
                          }}
                          placeholder="e.g., GST, VAT"
                        />
                      </div>
                      <div className="flex-1">
                        <Label>Rate (%)</Label>
                        <Input
                          type="number"
                          value={tax.rate}
                          onChange={(e) => {
                            const newTaxes = [...taxes];
                            newTaxes[index].rate = parseFloat(e.target.value);
                            setTaxes(newTaxes);
                          }}
                          min="0"
                          max="100"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Enabled</Label>
                        <Switch
                          checked={tax.enabled}
                          onCheckedChange={(checked) => {
                            const newTaxes = [...taxes];
                            newTaxes[index].enabled = checked;
                            setTaxes(newTaxes);
                          }}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setTaxes(taxes.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTaxes([...taxes, { name: '', rate: 0, enabled: true }]);
                    }}
                  >
                    Add Tax
                  </Button>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        updateBusinessDetails.mutate({ tax_configuration: taxes });
                      }}
                    >
                      Save Tax Configuration
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure general settings for your business
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* General settings content */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

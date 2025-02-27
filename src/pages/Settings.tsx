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
import { Trash } from "lucide-react";

const INVOICE_TEMPLATES = [
  { 
    id: 'modern', 
    name: 'Modern Template', 
    description: 'A sleek and contemporary design with a clean layout.'
  },
  { 
    id: 'professional', 
    name: 'Professional Template', 
    description: 'A formal and polished design perfect for business use.'
  },
  { 
    id: 'classic', 
    name: 'Classic Template', 
    description: 'A timeless and traditional invoice layout.'
  }
];

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [taxes, setTaxes] = useState<Array<{ name: string; rate: number; enabled: boolean; }>>([]);

  const {
    data: businessDetails,
    error: businessError,
    refetch: refetchBusinessDetails
  } = useQuery({
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

  const updateBusinessDetailsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from('business_details')
        .update(updates)
        .eq('user_id', userData.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchBusinessDetails();
      toast({
        title: "Success",
        description: "Business details updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update business details",
        variant: "destructive",
      });
    }
  });

  const updateBusinessDetails = (updates: any) => {
    updateBusinessDetailsMutation.mutate(updates);
  };

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-10">
        <Tabs defaultValue="templates" className="space-y-8">
          <TabsList>
            <TabsTrigger value="templates">Invoice Templates</TabsTrigger>
            <TabsTrigger value="taxes">Tax Configuration</TabsTrigger>
            <TabsTrigger value="general">General Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Templates</CardTitle>
                <CardDescription>
                  Choose a template for your invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {INVOICE_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-6 cursor-pointer transition-all ${
                        businessDetails?.invoice_template === template.id 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'hover:border-gray-400 hover:shadow'
                      }`}
                      onClick={() => updateBusinessDetails({ invoice_template: template.id })}
                    >
                      <h3 className="font-semibold mb-2">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      {businessDetails?.invoice_template === template.id && (
                        <div className="mt-4 text-sm text-primary">Currently selected</div>
                      )}
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
                    <div key={index} className="flex gap-4 items-center border p-4 rounded-lg">
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
                        size="icon"
                        onClick={() => {
                          setTaxes(taxes.filter((_, i) => i !== index));
                        }}
                      >
                        <Trash className="h-4 w-4" />
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
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Business Profile</h3>
                    <p className="text-sm text-gray-500">
                      Manage your business information and preferences
                    </p>
                  </div>
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label>Business Name</Label>
                      <Input
                        value={businessDetails?.business_name || ''}
                        onChange={(e) => updateBusinessDetails({ business_name: e.target.value })}
                        placeholder="Enter your business name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Address</Label>
                      <Input
                        value={businessDetails?.business_address || ''}
                        onChange={(e) => updateBusinessDetails({ business_address: e.target.value })}
                        placeholder="Enter your business address"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Default Invoice Template</Label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={businessDetails?.invoice_template || 'classic'}
                        onChange={(e) => updateBusinessDetails({ invoice_template: e.target.value })}
                      >
                        <option value="classic">Classic</option>
                        <option value="modern">Modern</option>
                        <option value="professional">Professional</option>
                        <option value="golden">Golden</option>
                        <option value="diamond">Diamond</option>
                        <option value="funky">Funky</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Terms and Conditions</Label>
                      <textarea
                        className="w-full p-2 border rounded-md min-h-[200px]"
                        value={businessDetails?.terms_and_conditions || ''}
                        onChange={(e) => updateBusinessDetails({ terms_and_conditions: e.target.value })}
                        placeholder="Enter your business terms and conditions"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

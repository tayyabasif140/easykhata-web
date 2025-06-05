
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building, Upload, FileText } from "lucide-react";
import { SignatureManager } from "./SignatureManager";

export function BusinessSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    business_name: "",
    business_address: "",
    business_phone: "",
    business_email: "",
    invoice_template: "classic",
  });

  const { data: businessDetails, isLoading } = useQuery({
    queryKey: ['businessDetails'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('business_details')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setFormData({
          business_name: data.business_name || "",
          business_address: data.business_address || "",
          business_phone: data.business_phone || "",
          business_email: data.business_email || "",
          invoice_template: data.invoice_template || "classic",
        });
      }
      
      return data;
    }
  });

  const updateBusiness = useMutation({
    mutationFn: async (updates: typeof formData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('business_details')
        .upsert({
          ...updates,
          user_id: userData.user.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessDetails'] });
      toast({
        title: "Success",
        description: "Business details updated successfully",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusiness.mutate(formData);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            Update your business details for invoices and estimates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  business_name: e.target.value
                }))}
                placeholder="Enter your business name"
              />
            </div>
            
            <div>
              <Label htmlFor="business_address">Business Address</Label>
              <Textarea
                id="business_address"
                value={formData.business_address}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  business_address: e.target.value
                }))}
                placeholder="Enter your business address"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="business_phone">Business Phone</Label>
                <Input
                  id="business_phone"
                  value={formData.business_phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    business_phone: e.target.value
                  }))}
                  placeholder="Enter business phone"
                />
              </div>
              
              <div>
                <Label htmlFor="business_email">Business Email</Label>
                <Input
                  id="business_email"
                  type="email"
                  value={formData.business_email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    business_email: e.target.value
                  }))}
                  placeholder="Enter business email"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="invoice_template">Invoice Template</Label>
              <Select
                value={formData.invoice_template}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  invoice_template: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="diamond">Diamond</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button type="submit" disabled={updateBusiness.isPending}>
              {updateBusiness.isPending ? "Updating..." : "Update Business Details"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Digital Signature
          </CardTitle>
          <CardDescription>
            Upload your digital signature for invoices and estimates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignatureManager />
        </CardContent>
      </Card>
    </div>
  );
}

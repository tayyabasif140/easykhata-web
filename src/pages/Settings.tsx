
import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const INVOICE_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic Template',
    description: 'A clean and professional design',
    preview: '/classic-template.png'
  },
  {
    id: 'modern',
    name: 'Modern Template',
    description: 'Contemporary and sleek layout',
    preview: '/modern-template.png'
  },
  {
    id: 'professional',
    name: 'Professional Template',
    description: 'Formal and detailed design',
    preview: '/professional-template.png'
  },
];

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState('classic');

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

  const updateTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('business_details')
        .update({ invoice_template: templateId })
        .eq('user_id', userData.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessDetails'] });
      toast({
        title: "Success",
        description: "Invoice template updated successfully",
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your business preferences</p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Invoice Template</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              {INVOICE_TEMPLATES.map((template) => (
                <div key={template.id} className="relative">
                  <RadioGroupItem
                    value={template.id}
                    id={template.id}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={template.id}
                    className="block cursor-pointer"
                  >
                    <div className={`border rounded-lg p-4 transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-gray-400'
                    }`}>
                      <div className="aspect-[4/5] bg-gray-100 rounded mb-4">
                        <img
                          src={template.preview}
                          alt={template.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-6">
              <Button
                onClick={() => updateTemplate.mutate(selectedTemplate)}
                disabled={updateTemplate.isPending}
              >
                Save Template Preference
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;

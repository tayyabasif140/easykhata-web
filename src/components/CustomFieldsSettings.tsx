
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";

export function CustomFieldsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newField, setNewField] = useState({
    column_name: "",
    column_type: "text"
  });

  const { data: customFields, isLoading } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('custom_columns')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    }
  });

  const createField = useMutation({
    mutationFn: async (fieldData: typeof newField) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('custom_columns')
        .insert({
          ...fieldData,
          user_id: userData.user.id
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      setNewField({ column_name: "", column_type: "text" });
      toast({
        title: "Success",
        description: "Custom field created successfully",
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

  const deleteField = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from('custom_columns')
        .update({ is_active: false })
        .eq('id', fieldId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      toast({
        title: "Success",
        description: "Custom field deleted successfully",
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
    if (!newField.column_name.trim()) {
      toast({
        title: "Error",
        description: "Field name is required",
        variant: "destructive",
      });
      return;
    }
    createField.mutate(newField);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Fields</CardTitle>
        <CardDescription>
          Create custom fields that can be optionally added to invoices and estimates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="field_name">Field Name</Label>
              <Input
                id="field_name"
                value={newField.column_name}
                onChange={(e) => setNewField(prev => ({
                  ...prev,
                  column_name: e.target.value
                }))}
                placeholder="Enter field name"
              />
            </div>
            
            <div>
              <Label htmlFor="field_type">Field Type</Label>
              <Select
                value={newField.column_type}
                onValueChange={(value) => setNewField(prev => ({
                  ...prev,
                  column_type: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button type="submit" disabled={createField.isPending} className="gap-2">
                <Plus className="w-4 h-4" />
                {createField.isPending ? "Adding..." : "Add Field"}
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Existing Fields</h3>
          {customFields && customFields.length > 0 ? (
            <div className="space-y-2">
              {customFields.map((field) => (
                <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">{field.column_name}</span>
                    <span className="text-sm text-gray-500 ml-2">({field.column_type})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteField.mutate(field.id)}
                    disabled={deleteField.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No custom fields created yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CustomColumn {
  id: string;
  name: string;
  type: 'text' | 'number';
}

export function AdditionalFeaturesSettings() {
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    },
    onSuccess: (data) => {
      if (data?.custom_columns) {
        setCustomColumns(data.custom_columns);
      }
    }
  });

  const addColumn = () => {
    const newColumn: CustomColumn = {
      id: Date.now().toString(),
      name: '',
      type: 'text'
    };
    setCustomColumns([...customColumns, newColumn]);
  };

  const removeColumn = (id: string) => {
    setCustomColumns(customColumns.filter(col => col.id !== id));
  };

  const updateColumn = (id: string, field: keyof CustomColumn, value: string) => {
    setCustomColumns(customColumns.map(col => 
      col.id === id ? { ...col, [field]: value } : col
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('business_details')
        .update({
          custom_columns: customColumns.filter(col => col.name.trim() !== '')
        })
        .eq('user_id', userData.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom columns saved successfully"
      });

      queryClient.invalidateQueries({ queryKey: ['businessDetails'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save custom columns",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Custom Invoice Columns</h3>
        <p className="text-sm text-gray-600">
          Add custom columns that will appear in your invoice and estimate PDFs after the description column.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          {customColumns.map((column, index) => (
            <div key={column.id} className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor={`column-name-${index}`}>Column Name</Label>
                <Input
                  id={`column-name-${index}`}
                  value={column.name}
                  onChange={(e) => updateColumn(column.id, 'name', e.target.value)}
                  placeholder="e.g., SKU, Category, Notes"
                />
              </div>
              <div className="w-32">
                <Label htmlFor={`column-type-${index}`}>Type</Label>
                <select
                  id={`column-type-${index}`}
                  value={column.type}
                  onChange={(e) => updateColumn(column.id, 'type', e.target.value as 'text' | 'number')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                </select>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeColumn(column.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={addColumn} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Column
        </Button>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Custom Columns"}
          </Button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Custom columns will appear in your invoice and estimate PDFs</li>
          <li>• They will be positioned after the description column</li>
          <li>• You can add values for these columns when creating invoices/estimates</li>
          <li>• Text columns are for information like SKU, category, or notes</li>
          <li>• Number columns are for quantities, weights, or measurements</li>
        </ul>
      </div>
    </div>
  );
}

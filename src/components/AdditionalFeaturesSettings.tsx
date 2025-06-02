
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function AdditionalFeaturesSettings() {
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customColumns } = useQuery({
    queryKey: ['customColumns'],
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

  const createColumnMutation = useMutation({
    mutationFn: async ({ columnName, columnType }: { columnName: string; columnType: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('custom_columns')
        .insert([{
          user_id: userData.user.id,
          column_name: columnName,
          column_type: columnType,
          is_active: true
        }]);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customColumns'] });
      setNewColumnName("");
      setNewColumnType("text");
      toast({
        title: "Success",
        description: "Custom column added successfully",
      });
    }
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      const { error } = await supabase
        .from('custom_columns')
        .update({ is_active: false })
        .eq('id', columnId);

      if (error) throw error;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['customColumns'] });
      toast({
        title: "Success",
        description: "Custom column removed successfully",
      });
    }
  });

  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newColumnName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a column name",
        variant: "destructive"
      });
      return;
    }

    createColumnMutation.mutate({
      columnName: newColumnName.trim(),
      columnType: newColumnType
    });
  };

  const handleDeleteColumn = (columnId: string) => {
    deleteColumnMutation.mutate(columnId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Features</CardTitle>
        <CardDescription>
          Add custom columns to your invoices and estimates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-4">Add New Column</h4>
          <form onSubmit={handleAddColumn} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="columnName">Column Name</Label>
                <Input
                  id="columnName"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="e.g., Serial Number, Category"
                  required
                />
              </div>
              <div>
                <Label htmlFor="columnType">Column Type</Label>
                <Select value={newColumnType} onValueChange={setNewColumnType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" size="sm" disabled={createColumnMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {createColumnMutation.isPending ? "Adding..." : "Add Column"}
            </Button>
          </form>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-4">Existing Columns</h4>
          {customColumns && customColumns.length > 0 ? (
            <div className="space-y-2">
              {customColumns.map((column) => (
                <div key={column.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">{column.column_name}</span>
                    <span className="text-sm text-gray-500 ml-2">({column.column_type})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteColumn(column.id)}
                    disabled={deleteColumnMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No custom columns added yet.</p>
          )}
        </div>

        <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
          <p className="font-medium mb-1">Note:</p>
          <p>Custom columns will appear in your invoice and estimate PDFs after the description column.</p>
        </div>
      </CardContent>
    </Card>
  );
}

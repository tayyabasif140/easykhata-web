
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

export function AdditionalFeaturesSettings() {
  const [columns, setColumns] = useState<any[]>([]);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customColumns } = useQuery({
    queryKey: ['custom-columns'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('custom_columns')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    if (customColumns) {
      setColumns(customColumns);
    }
  }, [customColumns]);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newColumnName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a column name",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('custom_columns')
        .insert([{
          user_id: userData.user.id,
          column_name: newColumnName.trim(),
          column_type: newColumnType,
          is_active: true
        }])
        .select();
      
      if (error) throw error;
      
      setNewColumnName("");
      setNewColumnType("text");
      
      toast({
        title: "Success",
        description: "Custom column added successfully"
      });
      
      queryClient.invalidateQueries({ queryKey: ['custom-columns'] });
      setColumns([...columns, data[0]]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add custom column",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from('custom_columns')
        .update({ is_active: false })
        .eq('id', columnId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Custom column removed successfully"
      });
      
      queryClient.invalidateQueries({ queryKey: ['custom-columns'] });
      setColumns(columns.filter(col => col.id !== columnId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove custom column",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Configure tax rates and payment information for your invoices and estimates.
          </p>
          <Button asChild>
            <Link to="/tax-management">
              Manage Taxes
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custom Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Add custom fields to your invoices and estimates to track additional information.
          </p>

          <form onSubmit={handleAddColumn} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Field Name</Label>
                <Input 
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="e.g., Project ID"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select value={newColumnType} onValueChange={setNewColumnType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  <Plus className="w-4 h-4" />
                  {isSubmitting ? "Adding..." : "Add Field"}
                </Button>
              </div>
            </div>
          </form>

          {columns.length > 0 ? (
            <div className="border rounded-md">
              <div className="p-4 bg-gray-50 border-b font-medium flex items-center justify-between">
                <span>Field Name</span>
                <span>Type</span>
              </div>
              {columns.map((column) => (
                <div key={column.id} className="p-4 border-b last:border-b-0 flex items-center justify-between">
                  <span>{column.column_name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 capitalize">{column.column_type}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteColumn(column.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 border rounded-md bg-gray-50">
              <p className="text-gray-500">No custom fields added yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

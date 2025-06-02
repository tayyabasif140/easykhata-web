import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";

export function AdditionalFeaturesSettings() {
  const [customColumns, setCustomColumns] = useState<any[]>([]);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingColumns } = useQuery({
    queryKey: ['customColumns'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('custom_columns')
        .select('*')
        .eq('user_id', userData.user.id);
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (existingColumns) {
      setCustomColumns(existingColumns);
    }
  }, [existingColumns]);

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a column name",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('custom_columns')
        .insert([{
          user_id: userData.user.id,
          column_name: newColumnName.trim(),
          column_type: newColumnType,
          is_active: true
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom column added successfully",
      });

      setNewColumnName("");
      setNewColumnType("text");
      queryClient.invalidateQueries({ queryKey: ['customColumns'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add custom column",
        variant: "destructive"
      });
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from('custom_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Custom column deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['customColumns'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete custom column",
        variant: "destructive"
      });
    }
  };

  const handleToggleColumn = async (columnId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_columns')
        .update({ is_active: isActive })
        .eq('id', columnId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Custom column ${isActive ? 'activated' : 'deactivated'} successfully`,
      });

      queryClient.invalidateQueries({ queryKey: ['customColumns'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update custom column",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Features</CardTitle>
        <CardDescription>
          Manage custom columns and additional features for your invoices and estimates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Custom Column */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Add Custom Column</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Column Name</Label>
              <Input
                id="columnName"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Enter column name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="columnType">Column Type</Label>
              <Select value={newColumnType} onValueChange={setNewColumnType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="boolean">Yes/No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddColumn} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </Button>
            </div>
          </div>
        </div>

        {/* Existing Custom Columns */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Existing Custom Columns</h4>
          {customColumns && customColumns.length > 0 ? (
            <div className="space-y-3">
              {customColumns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{column.column_name}</div>
                    <div className="text-sm text-gray-500 capitalize">
                      Type: {column.column_type}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`toggle-${column.id}`} className="text-sm">
                        Active
                      </Label>
                      <Switch
                        id={`toggle-${column.id}`}
                        checked={column.is_active}
                        onCheckedChange={(checked) =>
                          handleToggleColumn(column.id, checked)
                        }
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteColumn(column.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No custom columns created yet. Add your first custom column above.
            </div>
          )}
        </div>

        {/* Feature Information */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">About Custom Columns</h4>
          <p className="text-sm text-blue-700">
            Custom columns allow you to add additional fields to your invoices and estimates. 
            These fields will appear in your PDF templates and can be used to track custom 
            information specific to your business needs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

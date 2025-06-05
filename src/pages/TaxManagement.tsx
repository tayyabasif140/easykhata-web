
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BackButton } from "@/components/BackButton";

const TaxManagement = () => {
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxRate, setNewTaxRate] = useState("");
  const [editingTax, setEditingTax] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: taxes, isLoading } = useQuery({
    queryKey: ['taxes'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('tax_payments')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTaxName || !newTaxRate) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tax_payments')
        .insert([{
          user_id: userData.user.id,
          description: newTaxName,
          amount: parseFloat(newTaxRate),
          payment_date: new Date().toISOString().split('T')[0]
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tax created successfully!",
      });

      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      setNewTaxName("");
      setNewTaxRate("");
      setShowCreateDialog(false);

    } catch (error: any) {
      console.error('Error creating tax:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tax",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTax = async (taxId: string) => {
    try {
      const { error } = await supabase
        .from('tax_payments')
        .delete()
        .eq('id', taxId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tax deleted successfully!",
      });

      queryClient.invalidateQueries({ queryKey: ['taxes'] });

    } catch (error: any) {
      console.error('Error deleting tax:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete tax",
        variant: "destructive"
      });
    }
  };

  const handleEditTax = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTax || !editingTax.description || !editingTax.amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('tax_payments')
        .update({
          description: editingTax.description,
          amount: parseFloat(editingTax.amount)
        })
        .eq('id', editingTax.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tax updated successfully!",
      });

      queryClient.invalidateQueries({ queryKey: ['taxes'] });
      setEditingTax(null);

    } catch (error: any) {
      console.error('Error updating tax:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tax",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">Loading taxes...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-3xl font-bold text-gray-900">Tax Management</h1>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Tax
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Tax</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTax} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tax Name</Label>
                  <Input
                    value={newTaxName}
                    onChange={(e) => setNewTaxName(e.target.value)}
                    placeholder="e.g., VAT, Sales Tax"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(e.target.value)}
                    placeholder="e.g., 17"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Tax"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {taxes && taxes.length > 0 ? (
            taxes.map((tax) => (
              <Card key={tax.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {tax.description}
                    </CardTitle>
                    <CardDescription>
                      Rate: {tax.amount}%
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingTax(tax)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTax(tax.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(tax.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500 mb-4">No taxes found</p>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Your First Tax
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Tax Dialog */}
        {editingTax && (
          <Dialog open={!!editingTax} onOpenChange={(open) => !open && setEditingTax(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Tax</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditTax} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tax Name</Label>
                  <Input
                    value={editingTax.description}
                    onChange={(e) => setEditingTax({...editingTax, description: e.target.value})}
                    placeholder="e.g., VAT, Sales Tax"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={editingTax.amount}
                    onChange={(e) => setEditingTax({...editingTax, amount: e.target.value})}
                    placeholder="e.g., 17"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingTax(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Updating..." : "Update Tax"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
};

export default TaxManagement;

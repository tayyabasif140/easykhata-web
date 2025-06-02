
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "./ui/textarea";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

interface EditEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimateId: string;
}

export function EditEstimateDialog({ open, onOpenChange, estimateId }: EditEstimateDialogProps) {
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState<Date>();
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Memoized calculations
  const subtotal = useMemo(() => 
    products.reduce((sum, product) => sum + (product.quantity * product.price), 0), 
    [products]
  );

  const totalTax = useMemo(() => {
    return products.reduce((sum, product) => {
      const productTotal = product.quantity * product.price;
      return sum + (productTotal * 0.17); // 17% tax
    }, 0);
  }, [products]);

  const total = useMemo(() => subtotal + totalTax, [subtotal, totalTax]);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userData.user.id);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: inventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userData.user.id);
      
      if (error) throw error;
      return data;
    }
  });

  // Load estimate data when dialog opens
  useEffect(() => {
    if (open && estimateId) {
      loadEstimateData();
    }
  }, [open, estimateId]);

  const loadEstimateData = async () => {
    setIsLoading(true);
    try {
      // Fetch estimate
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .single();

      if (estimateError) throw estimateError;

      // Fetch estimate items
      const { data: estimateItems, error: itemsError } = await supabase
        .from('estimate_items')
        .select('*')
        .eq('estimate_id', estimateId);

      if (itemsError) throw itemsError;

      // Set form data
      setCustomerId(estimate.customer_id);
      setValidUntil(estimate.valid_until ? new Date(estimate.valid_until) : undefined);
      
      const loadedProducts: Product[] = estimateItems.map((item, index) => ({
        id: item.id || index.toString(),
        name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        description: item.description || ""
      }));
      
      setProducts(loadedProducts);
    } catch (error: any) {
      console.error('Error loading estimate:', error);
      toast({
        title: "Error",
        description: "Failed to load estimate data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addProduct = () => {
    setProducts([...products, { 
      id: Date.now().toString(), 
      name: "", 
      quantity: 1, 
      price: 0,
      description: ""
    }]);
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const selectInventoryItem = (id: string, inventoryItem: any) => {
    setProducts(products.map(p => 
      p.id === id ? { 
        ...p, 
        name: inventoryItem.product_name,
        price: inventoryItem.price,
        description: inventoryItem.description || ""
      } : p
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId || products.length === 0) {
      toast({
        title: "Error",
        description: "Please select a customer and add at least one product",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update estimate
      const { error: estimateError } = await supabase
        .from('estimates')
        .update({
          customer_id: customerId,
          total_amount: subtotal,
          tax_amount: totalTax,
          valid_until: validUntil?.toISOString().split('T')[0],
        })
        .eq('id', estimateId);

      if (estimateError) throw estimateError;

      // Delete existing estimate items
      const { error: deleteError } = await supabase
        .from('estimate_items')
        .delete()
        .eq('estimate_id', estimateId);

      if (deleteError) throw deleteError;

      // Create new estimate items
      const estimateItems = products.map(product => ({
        estimate_id: estimateId,
        product_name: product.name,
        description: product.description || null,
        quantity: product.quantity,
        price: product.price,
        total: product.quantity * product.price
      }));

      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(estimateItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Estimate updated successfully!",
      });

      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error updating estimate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update estimate",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Estimate</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">Loading estimate data...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.company ? `(${customer.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Valid Until</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !validUntil && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {validUntil ? format(validUntil, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={validUntil}
                      onSelect={setValidUntil}
                      initialFocus
                      className="p-3 pointer-events-auto rounded-xl border-2 border-primary/20 shadow-lg"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Products/Services</Label>
                <Button type="button" onClick={addProduct} size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>

              {products.map((product, index) => (
                <div key={product.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Product/Service Name</Label>
                        <div className="flex gap-2">
                          <Input
                            value={product.name}
                            onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                            placeholder="Enter product name"
                            required
                            className="flex-1 bg-white"
                          />
                          <Select onValueChange={(value) => {
                            const item = inventory?.find(inv => inv.id === value);
                            if (item) selectInventoryItem(product.id, item);
                          }}>
                            <SelectTrigger className="w-40 bg-white">
                              <SelectValue placeholder="Import from Inventory" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventory?.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.product_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Description</Label>
                        <Textarea
                          value={product.description || ""}
                          onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                          placeholder="Enter description (optional)"
                          className="min-h-[60px] bg-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 1)}
                          required
                          className="bg-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Price (Rs.)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                          required
                          className="bg-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Total</Label>
                        <div className="px-3 py-2 bg-gray-100 border rounded-md text-sm font-medium">
                          Rs.{(product.quantity * product.price).toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex justify-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeProduct(product.id)}
                          className="w-20"
                        >
                          <X className="w-4 h-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="space-y-2 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs.{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (17%):</span>
                  <span>Rs.{totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>Rs.{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Estimate"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

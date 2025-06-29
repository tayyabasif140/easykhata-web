
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateSupplierDialog } from "./CreateSupplierDialog";

interface Product {
  id: string;
  product_name: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateExpenseDialog = ({ open, onOpenChange }: CreateExpenseDialogProps) => {
  const [supplierId, setSupplierId] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState<Date>();
  const [status, setStatus] = useState("draft");
  const [products, setProducts] = useState<Product[]>([]);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('name');
      
      if (error) {
        console.error('Error fetching suppliers:', error);
        return [];
      }
      return data || [];
    }
  });

  const subtotal = useMemo(() => 
    products.reduce((sum, product) => sum + (product.quantity * product.price), 0), 
    [products]
  );

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      product_name: "",
      description: "",
      quantity: 1,
      price: 0,
      total: 0
    };
    setProducts([...products, newProduct]);
  };

  const updateProduct = (id: string, field: keyof Product, value: string | number) => {
    setProducts(products.map(product => {
      if (product.id === id) {
        const updatedProduct = { ...product, [field]: value };
        if (field === 'quantity' || field === 'price') {
          updatedProduct.total = updatedProduct.quantity * updatedProduct.price;
        }
        return updatedProduct;
      }
      return product;
    }));
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const handleSubmit = async () => {
    if (!supplierId || !description || !expenseDate || products.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and add at least one product.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Create the expense
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          user_id: userData.user.id,
          supplier_id: supplierId,
          description,
          expense_date: format(expenseDate, 'yyyy-MM-dd'),
          total_amount: subtotal,
          status
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Create expense items
      const expenseItems = products.map(product => ({
        expense_id: expense.id,
        product_name: product.product_name,
        description: product.description,
        quantity: product.quantity,
        price: product.price,
        total: product.total
      }));

      const { error: itemsError } = await supabase
        .from('expense_items')
        .insert(expenseItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Expense created successfully!"
      });

      // Reset form
      setSupplierId("");
      setDescription("");
      setExpenseDate(undefined);
      setStatus("draft");
      setProducts([]);
      onOpenChange(false);

      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: "Error",
        description: "Failed to create expense. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Supplier Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <div className="flex gap-2">
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name} {supplier.company && `(${supplier.company})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSupplierDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description and Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter expense description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Expense Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expenseDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expenseDate ? format(expenseDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expenseDate}
                      onSelect={setExpenseDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Products Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Products/Services</CardTitle>
                <Button type="button" onClick={addProduct} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.map((product, index) => (
                    <div key={product.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        <Label>Product Name</Label>
                        <Input
                          value={product.product_name}
                          onChange={(e) => updateProduct(product.id, 'product_name', e.target.value)}
                          placeholder="Product name"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Description</Label>
                        <Input
                          value={product.description}
                          onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={product.quantity}
                          onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>Total</Label>
                        <div className="text-sm font-medium pt-2">
                          ${product.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProduct(product.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Total Amount:</span>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      ${subtotal.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateSupplierDialog
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
      />
    </>
  );
};

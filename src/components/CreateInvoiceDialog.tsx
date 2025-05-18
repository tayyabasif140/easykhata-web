
import { useState } from "react";
import { Button } from "./ui/button";
import { Plus, Save } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Plus as PlusIcon, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

interface InvoiceItem {
  product_id?: string | null;
  product_name: string;
  quantity: number;
  price: number;
  total?: number;
}

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{
    product_name: '',
    quantity: 1,
    price: 0,
    total: 0
  }]);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    },
    enabled: open, // Only fetch when dialog is open
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: open, // Only fetch when dialog is open
  });

  const addNewItem = () => {
    setItems([
      ...items,
      {
        product_name: '',
        quantity: 1,
        price: 0,
        total: 0
      }
    ]);
  };

  const updateItem = <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => {
    const updatedItems = [...items];
    
    updatedItems[index][field] = value;
    
    // Recalculate total
    if (field === 'quantity' || field === 'price') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].price;
    }
    
    // If product was selected from inventory
    if (field === 'product_id') {
      const productId = value as string | null;
      const selectedProduct = products?.find(p => p.id === productId);
      if (selectedProduct) {
        updatedItems[index].product_name = selectedProduct.name;
        updatedItems[index].price = selectedProduct.price;
        updatedItems[index].total = updatedItems[index].quantity * selectedProduct.price;
      }
    }
    
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    const updatedItems = [...items];
    updatedItems.splice(index, 1);
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      if (!customerId) {
        toast({
          title: "Error",
          description: "Please select a customer",
          variant: "destructive"
        });
        return;
      }
      
      if (items.length === 0) {
        toast({
          title: "Error",
          description: "Please add at least one item",
          variant: "destructive"
        });
        return;
      }
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      // Create new invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          customer_id: customerId,
          total_amount: calculateTotal(),
          tax_amount: taxAmount || 0,
          status: 'unpaid',
          due_date: dueDate ? dueDate.toISOString() : null,
          user_id: userData.user.id,
          description: `Invoice for ${customers?.find(c => c.id === customerId)?.name || 'customer'}`,
          notification_sent: false
        }])
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Insert invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          items.map(item => ({
            invoice_id: newInvoice.id,
            product_id: item.product_id || null,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price
          }))
        );
      
      if (itemsError) throw itemsError;
      
      toast({
        title: "Success",
        description: "Invoice created successfully"
      });
      
      // Reset form
      setCustomerId("");
      setItems([{
        product_name: '',
        quantity: 1,
        price: 0,
        total: 0
      }]);
      setDueDate(undefined);
      setTaxAmount(0);
      
      // Close dialog
      setOpen(false);
      
      // Refresh invoices list
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: `Failed to create invoice: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="gap-2" 
          data-create-invoice 
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[80vh] overflow-y-auto pr-1">
          <div className="space-y-6">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select 
                value={customerId} 
                onValueChange={setCustomerId}
              >
                <SelectTrigger id="customer">
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

            {/* Due Date and Tax Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "No due date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tax">Tax Amount</Label>
                <Input
                  id="tax"
                  type="number"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Invoice Items */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Invoice Items</h3>
                  <Button onClick={addNewItem} size="sm" variant="outline" className="flex items-center gap-1">
                    <PlusIcon className="h-4 w-4" /> Add Item
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Product</th>
                        <th className="text-right py-3 px-4 w-[100px]">Quantity</th>
                        <th className="text-right py-3 px-4 w-[120px]">Price</th>
                        <th className="text-right py-3 px-4 w-[120px]">Total</th>
                        <th className="text-right py-3 px-4 w-[70px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4">
                            <div className="space-y-2">
                              <Select
                                value={item.product_id || "custom"}
                                onValueChange={(value) => updateItem(index, 'product_id', value === "custom" ? null : value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a product or type below" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="custom">Custom Product</SelectItem>
                                  {products?.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name} (Rs.{product.price})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <Input
                                placeholder="Product name"
                                value={item.product_name}
                                onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="text-right"
                              min="1"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              type="number"
                              value={item.price}
                              onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                              className="text-right"
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td className="text-right py-3 px-4">
                            Rs.{(item.total || 0).toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4">
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-medium">
                        <td colSpan={3} className="text-right py-3 px-4">
                          Subtotal:
                        </td>
                        <td className="text-right py-3 px-4">
                          Rs.{calculateTotal().toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="text-right py-3 px-4">
                          Tax:
                        </td>
                        <td className="text-right py-3 px-4">
                          Rs.{taxAmount.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="text-lg font-bold">
                        <td colSpan={3} className="text-right py-3 px-4">
                          Total:
                        </td>
                        <td className="text-right py-3 px-4">
                          Rs.{(calculateTotal() + taxAmount).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Trash, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Textarea } from "./ui/textarea";

interface Product {
  name: string;
  quantity: number;
  price: number;
  description: string;
}

interface EditInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}

export function EditInvoiceDialog({ open, onOpenChange, invoiceId }: EditInvoiceDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [dueDate, setDueDate] = useState<Date>();
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Fetch invoice data when dialog opens
  const { data: invoiceData } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          customers (*)
        `)
        .eq('id', invoiceId)
        .single();
      
      if (invoiceError) throw invoiceError;

      const { data: items, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId);
      
      if (itemsError) throw itemsError;

      return { ...invoice, items };
    },
    enabled: !!invoiceId && open
  });

  // Load invoice data into form when available
  useEffect(() => {
    if (invoiceData) {
      setCustomerName(invoiceData.customers.name);
      setCompanyName(invoiceData.customers.company || '');
      setPhone(invoiceData.customers.phone || '');
      setEmail(invoiceData.customers.email || '');
      setDescription(invoiceData.description || '');
      setDueDate(invoiceData.due_date ? new Date(invoiceData.due_date) : undefined);
      setProducts(invoiceData.items.map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.price,
        description: item.description || ''
      })));
    }
  }, [invoiceData]);

  const updateProduct = useCallback((index: number, field: keyof Product, value: string | number) => {
    setProducts(prev => prev.map((product, i) => 
      i === index ? { ...product, [field]: value } : product
    ));
  }, []);

  const removeProduct = useCallback((index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (products.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    toast({
      title: "Updating invoice...",
      description: "Your changes are being saved",
    });

    try {
      // Update customer
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          name: customerName,
          company: companyName,
          phone,
          email
        })
        .eq('id', invoiceData?.customer_id);

      if (customerError) throw customerError;

      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          total_amount: subtotal,
          tax_amount: totalTax,
          description,
          due_date: dueDate?.toISOString().split('T')[0]
        })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Delete existing items
      const { error: deleteError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoiceId);

      if (deleteError) throw deleteError;

      // Insert updated items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          products.map(product => ({
            invoice_id: invoiceId,
            product_name: product.name,
            quantity: product.quantity,
            price: product.price,
            total: product.quantity * product.price,
            description: product.description
          }))
        );

      if (itemsError) throw itemsError;

      toast({
        title: "Success!",
        description: "Invoice updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoiceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Invoice description"
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
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

          <div className="space-y-4">
            <Label className="text-lg font-semibold">Products</Label>
            {products.map((product, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end p-4 border rounded-lg">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={product.name}
                    onChange={(e) => updateProduct(index, "name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={product.description}
                    onChange={(e) => updateProduct(index, "description", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={product.quantity}
                    onChange={(e) => updateProduct(index, "quantity", parseInt(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    min="0"
                    value={product.price}
                    onChange={(e) => updateProduct(index, "price", parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total</Label>
                  <Input
                    value={`Rs.${(product.quantity * product.price).toFixed(2)}`}
                    disabled
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-shrink-0"
                  onClick={() => removeProduct(index)}
                  disabled={products.length === 1}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rs.{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (17%):</span>
              <span>Rs.{totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>Rs.{total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

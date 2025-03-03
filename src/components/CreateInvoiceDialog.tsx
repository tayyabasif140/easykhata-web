import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export const CreateInvoiceDialog = () => {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [isPaid, setIsPaid] = useState(false);
  const navigate = useNavigate();

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
    }
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const customerDetails = customers?.find(c => c.id === customer);
      if (!customerDetails) throw new Error('Customer not found');

      const subtotal = products.reduce((acc, product) => acc + (product.quantity * product.price), 0);
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          customer_id: customer,
          user_id: userData.user.id,
          total_amount: subtotal,
          tax_amount: taxAmount,
          status: isPaid ? 'paid' : 'unpaid',
          due_date: dueDate,
          created_at: new Date(),
        }])
        .select()

      if (invoiceError) throw invoiceError;

      if (!invoiceData || invoiceData.length === 0) {
        throw new Error('Failed to create invoice');
      }

      const invoiceId = invoiceData[0].id;

      // Insert invoice items
      const invoiceItems = products.map(product => ({
        invoice_id: invoiceId,
        product_name: product.name,
        quantity: product.quantity,
        price: product.price,
        total: product.quantity * product.price
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Update customer's total_unpaid
      const { error: customerUpdateError } = await supabase
        .from('customers')
        .update({ total_unpaid: customerDetails.total_unpaid + totalAmount })
        .eq('id', customer);

      if (customerUpdateError) throw customerUpdateError;

      return invoiceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      setOpen(false);
      setCustomer("");
      setProductName("");
      setQuantity(1);
      setPrice(0);
      setProducts([]);
      setTaxRate(0);
      setDueDate(undefined);
      setIsPaid(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const addProduct = () => {
    if (!productName || !quantity || !price) {
      toast({
        title: "Error",
        description: "Please fill in all product details",
        variant: "destructive",
      });
      return;
    }

    const newProduct = {
      id: Math.random().toString(),
      name: productName,
      quantity: quantity,
      price: price,
    };
    setProducts([...products, newProduct]);
    setProductName("");
    setQuantity(1);
    setPrice(0);
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter((product) => product.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="customer">Customer</Label>
            <Select onValueChange={setCustomer}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity.toString()}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={price.toString()}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={addProduct} variant="secondary">Add Product</Button>

          <div>
            <Label>Products</Label>
            {products.length > 0 ? (
              <ul className="list-none p-0">
                {products.map((product) => (
                  <li key={product.id} className="flex items-center justify-between py-2 border-b">
                    <span>{product.name} ({product.quantity} x Rs.{product.price})</span>
                    <Button variant="destructive" size="sm" onClick={() => deleteProduct(product.id)}>Delete</Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No products added yet.</p>
            )}
          </div>

          <div>
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              value={taxRate.toString()}
              onChange={(e) => setTaxRate(parseFloat(e.target.value))}
            />
          </div>

          <div>
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="isPaid">Mark as Paid</Label>
            <Input
              id="isPaid"
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
            />
          </div>
        </div>
        <Button onClick={() => {
          createInvoice.mutate();
        }}>Create Invoice</Button>
      </DialogContent>
    </Dialog>
  );
};

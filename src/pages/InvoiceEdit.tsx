
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Plus, Save, Trash2, ArrowLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  price: number;
  total?: number;
  isNew?: boolean;
}

interface Invoice {
  id: string;
  customer_id: string;
  total_amount: number;
  tax_amount: number;
  status: 'paid' | 'unpaid';
  due_date?: string | null;
  // Add any other invoice properties here
}

interface Customer {
  id: string;
  name: string;
  company?: string | null;
  // Add other customer properties as needed
}

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  // Add other product properties as needed
}

const InvoiceEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  
  // Fetch invoice, items, customers and products data
  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        setLoading(true);
        
        // Fetch invoice
        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', id)
          .single();
          
        if (invoiceError) throw invoiceError;
        
        // Fetch invoice items
        const { data: itemsData, error: itemsError } = await supabase
          .from('invoice_items')
          .select('*')
          .eq('invoice_id', id);
          
        if (itemsError) throw itemsError;
        
        // Fetch all customers
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');
        
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', userData.user.id);
          
        if (customersError) throw customersError;
        
        // Fetch all products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', userData.user.id);
          
        if (productsError) throw productsError;
        
        // Set data to state
        setInvoice(invoiceData);
        setItems(itemsData.map((item: InvoiceItem) => ({
          ...item,
          total: item.quantity * item.price
        })));
        setCustomers(customersData);
        setProducts(productsData);
        
        if (invoiceData.due_date) {
          setDueDate(new Date(invoiceData.due_date));
        }
        
      } catch (error: any) {
        console.error('Error fetching invoice data:', error);
        toast({
          title: "Error",
          description: `Failed to load invoice: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvoiceData();
  }, [id, toast]);
  
  const addNewItem = () => {
    setItems([
      ...items,
      {
        product_name: '',
        quantity: 1,
        price: 0,
        total: 0,
        isNew: true
      }
    ]);
  };
  
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...items];
    
    updatedItems[index][field] = value;
    
    // Recalculate total
    if (field === 'quantity' || field === 'price') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].price;
    }
    
    // If product was selected from inventory
    if (field === 'product_id' && value) {
      const selectedProduct = products.find(p => p.id === value);
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
      setSaving(true);
      
      if (!invoice) {
        toast({
          title: "Error",
          description: "Invoice data is missing",
          variant: "destructive"
        });
        return;
      }
      
      if (!invoice.customer_id) {
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
      
      // Calculate totals
      const totalAmount = calculateTotal();
      
      // Update invoice
      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({
          customer_id: invoice.customer_id,
          total_amount: totalAmount,
          tax_amount: invoice.tax_amount || 0,
          status: invoice.status,
          due_date: dueDate ? dueDate.toISOString() : null,
        })
        .eq('id', id);
      
      if (invoiceUpdateError) throw invoiceUpdateError;
      
      // Handle invoice items updates
      // First, delete existing items that were removed
      const existingItemIds = items
        .filter(item => item.id) // Only get items that already exist in DB
        .map(item => item.id);
      
      // Delete items that are no longer in the items array
      if (existingItemIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id)
          .not('id', 'in', `(${existingItemIds.join(',')})`);
        
        if (deleteError) throw deleteError;
      } else {
        // If no existing items left, delete all items for this invoice
        const { error: deleteAllError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);
          
        if (deleteAllError) throw deleteAllError;
      }
      
      // Update existing items and insert new ones
      for (const item of items) {
        if (item.id) {
          // Update existing item
          const { error: updateItemError } = await supabase
            .from('invoice_items')
            .update({
              product_id: item.product_id || null,
              product_name: item.product_name,
              quantity: item.quantity,
              price: item.price
            })
            .eq('id', item.id);
            
          if (updateItemError) throw updateItemError;
        } else {
          // Insert new item
          const { error: insertItemError } = await supabase
            .from('invoice_items')
            .insert({
              invoice_id: id,
              product_id: item.product_id || null,
              product_name: item.product_name,
              quantity: item.quantity,
              price: item.price
            });
            
          if (insertItemError) throw insertItemError;
        }
      }
      
      toast({
        title: "Success",
        description: "Invoice updated successfully"
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      toast({
        title: "Error",
        description: `Failed to update invoice: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <LoadingSpinner fullScreen message="Loading invoice..." />;
  }
  
  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Card className="w-full max-w-md text-center">
              <CardHeader>
                <CardTitle>Invoice Not Found</CardTitle>
              </CardHeader>
              <CardContent>
                <p>The invoice you're looking for couldn't be found.</p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={() => navigate('/')}>Return to Dashboard</Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="flex justify-between items-center mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Edit Invoice</h1>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer</Label>
                <Select 
                  value={invoice.customer_id} 
                  onValueChange={(value) => setInvoice({...invoice, customer_id: value})}
                >
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.company ? `(${customer.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={invoice.status} 
                  onValueChange={(value: 'paid' | 'unpaid') => setInvoice({...invoice, status: value})}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
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
                  value={invoice.tax_amount || 0}
                  onChange={(e) => setInvoice({...invoice, tax_amount: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoice Items</CardTitle>
            <Button onClick={addNewItem} size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Product</th>
                    <th className="text-right py-3 px-4 w-[150px]">Quantity</th>
                    <th className="text-right py-3 px-4 w-[150px]">Price</th>
                    <th className="text-right py-3 px-4 w-[150px]">Total</th>
                    <th className="text-right py-3 px-4 w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4">
                          <div className="space-y-2">
                            <Select
                              value={item.product_id || ''}
                              onValueChange={(value) => updateItem(index, 'product_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a product or type below" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Custom Product</SelectItem>
                                {products.map((product) => (
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
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">
                        No items added yet. Click "Add Item" to add products to this invoice.
                      </td>
                    </tr>
                  )}
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
                      Rs.{(invoice.tax_amount || 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                  <tr className="text-lg font-bold">
                    <td colSpan={3} className="text-right py-3 px-4">
                      Total:
                    </td>
                    <td className="text-right py-3 px-4">
                      Rs.{(calculateTotal() + (invoice.tax_amount || 0)).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Invoice
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default InvoiceEdit;

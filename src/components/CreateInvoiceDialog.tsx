import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, Download, Trash, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Product {
  name: string;
  quantity: number;
  price: number;
}

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [products, setProducts] = useState<Product[]>([{ name: "", quantity: 1, price: 0 }]);
  const [tax, setTax] = useState(0);
  const [dueDate, setDueDate] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const addProduct = () => {
    setProducts([...products, { name: "", quantity: 1, price: 0 }]);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const calculateSubtotal = () => {
    return products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
  };

  const calculateTaxAmount = () => {
    return (calculateSubtotal() * tax) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxAmount();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const lineHeight = 10;
    let y = 20;

    // Add header
    doc.setFontSize(20);
    doc.text("INVOICE", 105, y, { align: "center" });
    y += lineHeight * 2;

    // Add customer details
    doc.setFontSize(12);
    doc.text(`Customer: ${customerName}`, 20, y);
    y += lineHeight;
    doc.text(`Company: ${companyName}`, 20, y);
    y += lineHeight;
    doc.text(`Phone: ${phone}`, 20, y);
    y += lineHeight;
    doc.text(`Email: ${email}`, 20, y);
    y += lineHeight * 2;

    // Add products table
    doc.text("Products:", 20, y);
    y += lineHeight;
    products.forEach((product) => {
      doc.text(`${product.name} - Qty: ${product.quantity} - Price: Rs.${product.price} - Total: Rs.${product.quantity * product.price}`, 20, y);
      y += lineHeight;
    });

    y += lineHeight;
    doc.text(`Subtotal: Rs.${calculateSubtotal()}`, 20, y);
    y += lineHeight;
    doc.text(`Tax (${tax}%): Rs.${calculateTaxAmount()}`, 20, y);
    y += lineHeight;
    doc.text(`Total: Rs.${calculateTotal()}`, 20, y);

    doc.save("invoice.pdf");
  };

  const previewPDF = () => {
    const doc = new jsPDF();
    const lineHeight = 10;
    let y = 20;

    // Add header
    doc.setFontSize(20);
    doc.text("INVOICE", 105, y, { align: "center" });
    y += lineHeight * 2;

    // Add customer details
    doc.setFontSize(12);
    doc.text(`Customer: ${customerName}`, 20, y);
    y += lineHeight;
    doc.text(`Company: ${companyName}`, 20, y);
    y += lineHeight;
    doc.text(`Phone: ${phone}`, 20, y);
    y += lineHeight;
    doc.text(`Email: ${email}`, 20, y);
    y += lineHeight * 2;

    // Add products table
    doc.text("Products:", 20, y);
    y += lineHeight;
    products.forEach((product) => {
      doc.text(`${product.name} - Qty: ${product.quantity} - Price: Rs.${product.price} - Total: Rs.${product.quantity * product.price}`, 20, y);
      y += lineHeight;
    });

    y += lineHeight;
    doc.text(`Subtotal: Rs.${calculateSubtotal()}`, 20, y);
    y += lineHeight;
    doc.text(`Tax (${tax}%): Rs.${calculateTaxAmount()}`, 20, y);
    y += lineHeight;
    doc.text(`Total: Rs.${calculateTotal()}`, 20, y);

    // Open PDF in new window for preview
    const pdfDataUri = doc.output('datauristring');
    const previewWindow = window.open('');
    previewWindow?.document.write(
      `<iframe width='100%' height='100%' src='${pdfDataUri}'></iframe>`
    );
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setCompanyName(customer.company || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create customer
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .insert([
          { name: customerName, company: companyName, phone, email }
        ])
        .select()
        .single();

      if (customerError) throw customerError;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            customer_id: customer.id,
            total_amount: calculateTotal(),
            tax_amount: calculateTaxAmount(),
            status: 'unpaid',
            description: `Invoice for ${customerName}`,
            due_date: dueDate?.toISOString().split('T')[0],
            notification_sent: false
          }
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(
          products.map(product => ({
            invoice_id: invoice.id,
            product_name: product.name,
            quantity: product.quantity,
            price: product.price,
            total: product.quantity * product.price
          }))
        );

      if (itemsError) throw itemsError;

      generatePDF();
      
      toast({
        title: "Success",
        description: "Invoice created successfully!",
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });

      setOpen(false);
      
      // Reset form
      setCustomerName("");
      setCompanyName("");
      setPhone("");
      setEmail("");
      setProducts([{ name: "", quantity: 1, price: 0 }]);
      setTax(0);
      setDueDate(undefined);

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Label>Select Existing Customer</Label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              onChange={(e) => handleCustomerSelect(e.target.value)}
            >
              <option value="">Select a customer...</option>
              {customers?.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.company ? `(${customer.company})` : ''}
                </option>
              ))}
            </select>
          </div>

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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Products</h3>
              <Button type="button" variant="outline" onClick={addProduct}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
            {products.map((product, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input
                    value={product.name}
                    onChange={(e) => updateProduct(index, "name", e.target.value)}
                    required
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

          <div className="space-y-2">
            <Label htmlFor="tax">Tax (%)</Label>
            <Input
              id="tax"
              type="number"
              min="0"
              max="100"
              value={tax}
              onChange={(e) => setTax(parseFloat(e.target.value))}
            />
          </div>

          <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rs.{calculateSubtotal()}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({tax}%):</span>
              <span>Rs.{calculateTaxAmount()}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>Rs.{calculateTotal()}</span>
            </div>
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

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" className="gap-2" onClick={previewPDF}>
              <Eye className="w-4 h-4" />
              Preview Invoice
            </Button>
            <Button type="submit" className="gap-2">
              Create Invoice
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={generatePDF}>
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

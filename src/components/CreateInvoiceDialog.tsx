import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, Download, Trash, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";

interface Product {
  name: string;
  quantity: number;
  price: number;
}

const INVOICE_TEMPLATES = [
  { id: 'classic', name: 'Classic Template', preview: '/classic-template.png' },
  { id: 'modern', name: 'Modern Template', preview: '/modern-template.png' },
  { id: 'professional', name: 'Professional Template', preview: '/professional-template.png' },
];

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [products, setProducts] = useState<Product[]>([{ name: "", quantity: 1, price: 0 }]);
  const [tax, setTax] = useState(0);
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedTaxes, setSelectedTaxes] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [showPreview, setShowPreview] = useState(false);

  const { data: inventoryProducts } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*');
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
    
    if (field === 'name' && typeof value === 'string') {
      const inventoryProduct = inventoryProducts?.find(
        p => p.product_name.toLowerCase() === value.toLowerCase()
      );
      
      if (inventoryProduct) {
        newProducts[index] = {
          ...newProducts[index],
          name: inventoryProduct.product_name,
          price: inventoryProduct.price,
        };
      } else {
        newProducts[index] = {
          ...newProducts[index],
          [field]: value,
        };
      }
    } else {
      newProducts[index] = {
        ...newProducts[index],
        [field]: value,
      };
    }
    
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

  const calculateTotalTax = () => {
    if (!businessDetails?.tax_configuration) return 0;
    const taxConfig = businessDetails.tax_configuration as any[];
    return taxConfig.reduce((sum, tax) => {
      if (selectedTaxes[tax.name] && tax.enabled) {
        return sum + (calculateSubtotal() * tax.rate) / 100;
      }
      return sum;
    }, 0);
  };

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

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setCompanyName(customer.company || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
    }
  };

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: businessDetails } = useQuery({
    queryKey: ['businessDetails'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from('business_details')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const updateInventory = useMutation({
    mutationFn: async (updates: { productName: string, quantity: number }) => {
      const { data: inventoryItem } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_name', updates.productName)
        .single();

      if (!inventoryItem) throw new Error('Product not found in inventory');

      const newQuantity = inventoryItem.quantity - updates.quantity;
      if (newQuantity < 0) throw new Error('Not enough stock');

      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('product_name', updates.productName);

      if (error) throw error;
    }
  });

  const generatePDF = (template = selectedTemplate) => {
    const doc = new jsPDF();
    const lineHeight = 10;
    let y = 20;

    // Add business logo if available
    if (businessDetails?.business_logo_url) {
      const logoUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`;
      doc.addImage(logoUrl, 'PNG', 20, y, 40, 40);
      y += 45;
    }

    doc.setFontSize(20);
    doc.text("INVOICE", 105, y, { align: "center" });
    y += lineHeight * 2;

    doc.setFontSize(12);
    doc.text(`Customer: ${customerName}`, 20, y);
    y += lineHeight;
    doc.text(`Company: ${companyName}`, 20, y);
    y += lineHeight;
    doc.text(`Phone: ${phone}`, 20, y);
    y += lineHeight;
    doc.text(`Email: ${email}`, 20, y);
    y += lineHeight * 2;

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
    y += lineHeight * 2;

    // Add signature if available
    if (profile?.digital_signature_url) {
      const signatureUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${profile.digital_signature_url}`;
      doc.addImage(signatureUrl, 'PNG', 20, y, 50, 20);
      y += 25;
      doc.text("Authorized Signature", 20, y);
    }

    return doc;
  };

  const previewPDF = () => {
    const doc = generatePDF();
    const pdfDataUri = doc.output('datauristring');
    const previewWindow = window.open('');
    previewWindow?.document.write(
      `<iframe width='100%' height='100%' src='${pdfDataUri}'></iframe>`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Update inventory quantities
      for (const product of products) {
        await updateInventory.mutateAsync({
          productName: product.name,
          quantity: product.quantity
        });
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check if customer already exists
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('name', customerName)
        .eq('company', companyName)
        .eq('email', email)
        .eq('phone', phone);

      let customerId;

      if (existingCustomers && existingCustomers.length > 0) {
        // Use existing customer
        customerId = existingCustomers[0].id;
      } else {
        // Create new customer
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert([{ 
            name: customerName, 
            company: companyName, 
            phone, 
            email,
            user_id: userData.user.id 
          }])
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = customer.id;
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([
          {
            customer_id: customerId,
            total_amount: calculateTotal(),
            tax_amount: calculateTotalTax(),
            status: 'unpaid',
            description: `Invoice for ${customerName}`,
            due_date: dueDate?.toISOString().split('T')[0],
            notification_sent: false,
            user_id: userData.user.id
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

      const doc = generatePDF(selectedTemplate);
      const pdfBlob = doc.output('blob');
      
      // Upload PDF to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(`invoice_${invoice.id}.pdf`, pdfBlob);
      
      if (uploadError) throw uploadError;

      // Update invoice with PDF URL
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ pdf_url: `invoice_${invoice.id}.pdf` })
        .eq('id', invoice.id);

      if (updateError) throw updateError;

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
      setEmail("");
      setPhone("");
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
        <Button className="gap-2" data-create-invoice>
          <Plus className="w-4 h-4" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <Label>Select Invoice Template</Label>
          <div className="grid grid-cols-3 gap-4 mt-2">
            {INVOICE_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedTemplate === template.id ? 'border-primary bg-primary/5' : 'hover:border-gray-400'
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div className="aspect-video bg-gray-100 rounded mb-2">
                  <img
                    src={template.preview}
                    alt={template.name}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <p className="text-sm font-medium text-center">{template.name}</p>
              </div>
            ))}
          </div>
        </div>

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
                    list={`products-${index}`}
                    value={product.name}
                    onChange={(e) => updateProduct(index, "name", e.target.value)}
                    required
                  />
                  <datalist id={`products-${index}`}>
                    {inventoryProducts?.map((p) => (
                      <option key={p.id} value={p.product_name} />
                    ))}
                  </datalist>
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
            <Label>Select Invoice Template</Label>
            <div className="grid grid-cols-3 gap-4">
              {INVOICE_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate === template.id ? 'border-primary bg-primary/5' : 'hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="aspect-video bg-gray-100 rounded mb-2">
                    <img
                      src={template.preview}
                      alt={template.name}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <p className="text-sm text-center">{template.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Tax Options</Label>
            <div className="space-y-2">
              {businessDetails?.tax_configuration?.map((tax: any) => (
                tax.enabled && (
                  <div key={tax.name} className="flex items-center justify-between">
                    <Label>{tax.name} ({tax.rate}%)</Label>
                    <Switch
                      checked={selectedTaxes[tax.name] || false}
                      onCheckedChange={(checked) => {
                        setSelectedTaxes({ ...selectedTaxes, [tax.name]: checked });
                      }}
                    />
                  </div>
                )
              ))}
            </div>
          </div>

          <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>Rs.{calculateSubtotal()}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>Rs.{calculateTotalTax()}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>Rs.{calculateSubtotal() + calculateTotalTax()}</span>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              data-create-invoice
            >
              Create Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


import { useState, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, Download, Trash, Eye, CheckCircle } from "lucide-react";
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
import { generateInvoicePDF } from "@/utils/invoiceTemplates";
import { SignatureManager } from "./SignatureManager";

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
  const [selectedTaxes, setSelectedTaxes] = useState<{[key: string]: boolean}>({});
  const [selectedSignature, setSelectedSignature] = useState<string>('');
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [showLogoSelector, setShowLogoSelector] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Optimized queries with proper caching - moved businessDetails query before usage
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
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000, // Updated from cacheTime to gcTime
  });

  // Memoized calculations for better performance
  const subtotal = useMemo(() => 
    products.reduce((sum, product) => sum + (product.quantity * product.price), 0), 
    [products]
  );

  const taxAmount = useMemo(() => (subtotal * tax) / 100, [subtotal, tax]);

  const totalTax = useMemo(() => {
    if (!businessDetails?.tax_configuration) return 0;
    const taxConfig = businessDetails.tax_configuration as any[];
    return taxConfig.reduce((sum, tax) => {
      if (selectedTaxes[tax.name] && tax.enabled) {
        return sum + (subtotal * tax.rate) / 100;
      }
      return sum;
    }, 0);
  }, [businessDetails?.tax_configuration, selectedTaxes, subtotal]);

  const total = useMemo(() => subtotal + totalTax, [subtotal, totalTax]);

  const { data: inventoryProducts } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inventory').select('*');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // Updated from cacheTime to gcTime
  });

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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // Updated from cacheTime to gcTime
  });

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
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000, // Updated from cacheTime to gcTime
  });

  const { data: logos } = useQuery({
    queryKey: ['logos', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const { data, error } = await supabase.storage
          .from('business_files')
          .list(`${profile.id}/logo`, {
            sortBy: { column: 'name', order: 'desc' }
          });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error("Error fetching logos:", error);
        return [];
      }
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // Updated from cacheTime to gcTime
  });

  // Optimized product update with debouncing
  const updateProduct = useCallback((index: number, field: keyof Product, value: string | number) => {
    if (field === 'name' && typeof value === 'string') {
      const inventoryProduct = inventoryProducts?.find(
        p => p.product_name.toLowerCase() === value.toLowerCase()
      );
      
      if (inventoryProduct) {
        setProducts(prev => prev.map((product, i) => 
          i === index 
            ? { ...product, name: inventoryProduct.product_name, price: inventoryProduct.price }
            : product
        ));
        return;
      }
    }
    
    setProducts(prev => prev.map((product, i) => 
      i === index ? { ...product, [field]: value } : product
    ));
  }, [inventoryProducts]);

  const addProduct = useCallback(() => {
    setProducts(prev => [...prev, { name: "", quantity: 1, price: 0 }]);
  }, []);

  const removeProduct = useCallback((index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCustomerSelect = useCallback((customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      setCustomerName(customer.name);
      setCompanyName(customer.company || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
    }
  }, [customers]);

  const handleSignatureSelect = useCallback((signatureUrl: string) => {
    setSelectedSignature(signatureUrl);
    setShowSignatureCanvas(false);
  }, []);

  const handleLogoSelect = useCallback((logoUrl: string) => {
    setSelectedLogo(logoUrl);
    setShowLogoSelector(false);
  }, []);

  // Optimized PDF generation with immediate feedback
  const generatePDF = useCallback(async () => {
    // Show immediate notification
    toast({
      title: "Generating PDF...",
      description: "Your invoice is being prepared",
    });

    try {
      const template = businessDetails?.invoice_template || 'classic';
      
      const invoiceData = {
        customerName,
        companyName,
        phone,
        email,
        products,
        subtotal,
        tax: totalTax,
        total,
        dueDate,
        businessDetails,
        profile: {
          ...profile,
          digital_signature_url: selectedSignature || profile?.digital_signature_url
        },
        logoBase64: null,
        signatureBase64: null
      };
      
      return await generateInvoicePDF(template, invoiceData);
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    }
  }, [businessDetails, customerName, companyName, phone, email, products, subtotal, totalTax, total, dueDate, profile, selectedSignature]);

  // Optimized mutation for inventory updates
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show immediate loading state
    toast({
      title: "Creating Invoice...",
      description: "Processing your request",
    });

    try {
      // Update inventory first
      for (const product of products) {
        await updateInventory.mutateAsync({
          productName: product.name,
          quantity: product.quantity
        });
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check for existing customers
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
        customerId = existingCustomers[0].id;
      } else {
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
            total_amount: subtotal,
            tax_amount: totalTax,
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

      // Add invoice items
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

      // Generate and download PDF
      const doc = await generatePDF();
      if (doc) {
        const fileName = `invoice_${invoice.id}.pdf`;
        doc.save(fileName);
        
        toast({
          title: "Success!",
          description: "Invoice created and downloaded successfully",
        });
      }

      // Invalidate queries and reset form
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const resetForm = useCallback(() => {
    setCustomerName("");
    setCompanyName("");
    setEmail("");
    setPhone("");
    setProducts([{ name: "", quantity: 1, price: 0 }]);
    setTax(0);
    setDueDate(undefined);
    setSelectedTaxes({});
    setSelectedSignature("");
    setSelectedLogo("");
  }, []);

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
              <span>Rs.{subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>Rs.{totalTax}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>Rs.{total}</span>
            </div>
          </div>

          {/* Logo Selection - Simplified */}
          <div className="space-y-2">
            <Label>Business Logo</Label>
            <div>
              {showLogoSelector ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    {businessDetails?.business_logo_url && (
                      <div className={`border rounded-lg p-4 cursor-pointer ${selectedLogo === businessDetails.business_logo_url || (!selectedLogo && businessDetails.business_logo_url) ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}
                           onClick={() => handleLogoSelect(businessDetails.business_logo_url)}>
                        <div className="relative mb-2 bg-white h-24 flex items-center justify-center">
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`}
                            alt="Default logo"
                            className="h-20 w-auto object-contain"
                            loading="lazy"
                          />
                        </div>
                        <p className="text-center text-sm">
                          {selectedLogo === businessDetails.business_logo_url || (!selectedLogo && businessDetails.business_logo_url) ? 'Selected' : 'Select'}
                        </p>
                      </div>
                    )}
                    
                    {logos?.filter(logo => logo.name.includes('logo')).map((logo) => {
                      const logoPath = `${profile?.id}/logo/${logo.name}`;
                      if (businessDetails?.business_logo_url === logoPath) return null;
                      
                      return (
                        <div 
                          key={logo.id} 
                          className={`border rounded-lg p-4 cursor-pointer ${selectedLogo === logoPath ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}
                          onClick={() => handleLogoSelect(logoPath)}
                        >
                          <div className="relative mb-2 bg-white h-24 flex items-center justify-center">
                            <img
                              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${logoPath}`}
                              alt={`Logo ${logo.name}`}
                              className="h-20 w-auto object-contain"
                              loading="lazy"
                            />
                          </div>
                          <p className="text-center text-sm">
                            {selectedLogo === logoPath ? 'Selected' : 'Select'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setShowLogoSelector(false)}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div>
                  {(selectedLogo || businessDetails?.business_logo_url) ? (
                    <div className="flex flex-col space-y-2">
                      <img 
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${selectedLogo || businessDetails?.business_logo_url}`} 
                        alt="Business logo" 
                        className="h-20 border border-gray-200 bg-white p-2"
                        loading="lazy"
                      />
                      <Button type="button" variant="outline" onClick={() => setShowLogoSelector(true)}>
                        Change Logo
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => setShowLogoSelector(true)}>
                      Select Logo
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Signature section - Simplified */}
          {showSignatureCanvas ? (
            <div className="space-y-4">
              <Label>Signature</Label>
              {profile?.id && (
                <SignatureManager
                  userId={profile.id}
                  onSignatureSelect={handleSignatureSelect}
                  defaultSignature={selectedSignature || profile?.digital_signature_url}
                />
              )}
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setShowSignatureCanvas(false)}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Signature</Label>
              <div>
                {(selectedSignature || profile?.digital_signature_url) ? (
                  <div className="flex flex-col space-y-2">
                    <img 
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${selectedSignature || profile?.digital_signature_url}`} 
                      alt="Your signature" 
                      className="h-20 border border-gray-200 bg-white p-2"
                      loading="lazy"
                    />
                    <Button type="button" variant="outline" onClick={() => setShowSignatureCanvas(true)}>
                      Change Signature
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => setShowSignatureCanvas(true)}>
                    Add Your Signature
                  </Button>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={updateInventory.isPending}>
              {updateInventory.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

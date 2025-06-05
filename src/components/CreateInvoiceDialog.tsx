import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
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
import { generateInvoicePDF } from "@/utils/invoiceTemplates";
import { SignatureManager } from "./SignatureManager";
import { useNavigate } from "react-router-dom";
import { CustomerSelector } from "./CustomerSelector";
import { Checkbox } from "./ui/checkbox";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<string>('');
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<string>('');
  const [showLogoSelector, setShowLogoSelector] = useState(false);
  const [enableCustomFields, setEnableCustomFields] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [selectedTaxes, setSelectedTaxes] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Memoized calculations
  const subtotal = useMemo(() => 
    products.reduce((sum, product) => sum + (product.quantity * product.price), 0), 
    [products]
  );

  const totalTax = useMemo(() => {
    return selectedTaxes.reduce((sum, taxId) => {
      const tax = taxConfigurations.find(t => t.id === taxId);
      if (tax) {
        return sum + (subtotal * (tax.rate / 100));
      }
      return sum;
    }, 0);
  }, [products, selectedTaxes, taxConfigurations, subtotal]);

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

  const taxConfigurations = businessDetails?.tax_configuration || [];

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
    enabled: !!profile?.id
  });

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('custom_columns')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    }
  });

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

  const handleSignatureSelect = (signatureUrl: string) => {
    setSelectedSignature(signatureUrl);
    setShowSignatureCanvas(false);
  };

  const handleLogoSelect = (logoUrl: string) => {
    setSelectedLogo(logoUrl);
    setShowLogoSelector(false);
  };

  const generatePDF = async () => {
    try {
      const template = businessDetails?.invoice_template || 'classic';
      
      const invoiceData = {
        customerName: customers?.find(c => c.id === customerId)?.name || 'Customer',
        companyName: customers?.find(c => c.id === customerId)?.company || '',
        phone: customers?.find(c => c.id === customerId)?.phone || '',
        email: customers?.find(c => c.id === customerId)?.email || '',
        products,
        subtotal,
        tax: totalTax,
        total,
        dueDate: dueDate,
        businessDetails: {
          ...businessDetails,
          business_logo_url: selectedLogo || businessDetails?.business_logo_url
        },
        profile: {
          ...profile,
          digital_signature_url: selectedSignature || profile?.digital_signature_url
        },
        logoBase64: null,
        signatureBase64: null,
        isEstimate: false
      };
      
      return await generateInvoicePDF(template, invoiceData);
    } catch (error) {
      console.error("Error generating PDF:", error);
      throw error;
    }
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
    
    toast({
      title: "Creating invoice...",
      description: "Your invoice is being generated",
    });

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create invoice
      const invoiceData: any = {
        customer_id: customerId,
        total_amount: subtotal,
        tax_amount: totalTax,
        due_date: dueDate?.toISOString().split('T')[0],
        user_id: userData.user.id,
        status: 'unpaid'
      };

      // Add custom fields if enabled
      if (enableCustomFields && customFields) {
        customFields.forEach(field => {
          const value = customFieldValues[field.id];
          if (value) {
            invoiceData[field.column_name] = value;
          }
        });
      }

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([invoiceData])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = products.map(product => ({
        invoice_id: invoice.id,
        product_name: product.name,
        description: product.description || null,
        quantity: product.quantity,
        price: product.price,
        total: product.quantity * product.price
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Generate and download PDF with template
      const doc = await generatePDF();
      if (doc) {
        const fileName = `invoice_${invoice.id}.pdf`;
        doc.save(fileName);
      }

      toast({
        title: "Success",
        description: "Invoice created successfully!",
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setOpen(false);
      
      // Reset form
      setCustomerId("");
      setDueDate(undefined);
      setProducts([]);
      setSelectedSignature("");
      setSelectedLogo("");
      setEnableCustomFields(false);
      setCustomFieldValues({});
      setSelectedTaxes([]);

    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomerSelector
                  value={customerId}
                  onValueChange={setCustomerId}
                  required
                />
                
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
                        className="p-3 pointer-events-auto rounded-xl border-2 border-primary/20 shadow-lg"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Custom Fields Section */}
              {customFields && customFields.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="enable-custom-fields"
                      checked={enableCustomFields}
                      onCheckedChange={(checked) => setEnableCustomFields(checked as boolean)}
                    />
                    <Label htmlFor="enable-custom-fields">Enable Custom Fields</Label>
                  </div>

                  {enableCustomFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                      {customFields.map((field) => (
                        <div key={field.id}>
                          <Label htmlFor={field.id}>{field.column_name}</Label>
                          <Input
                            id={field.id}
                            type={field.column_type === 'number' ? 'number' : field.column_type === 'date' ? 'date' : 'text'}
                            value={customFieldValues[field.id] || ''}
                            onChange={(e) => setCustomFieldValues(prev => ({
                              ...prev,
                              [field.id]: e.target.value
                            }))}
                            placeholder={`Enter ${field.column_name.toLowerCase()}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tax Selection */}
              {taxConfigurations.length > 0 && (
                <div className="space-y-2">
                  <Label>Apply Taxes</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {taxConfigurations.map((tax) => (
                      <div key={tax.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tax-${tax.id}`}
                          checked={selectedTaxes.includes(tax.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTaxes(prev => [...prev, tax.id]);
                            } else {
                              setSelectedTaxes(prev => prev.filter(id => id !== tax.id));
                            }
                          }}
                        />
                        <Label htmlFor={`tax-${tax.id}`} className="text-sm">
                          {tax.name} ({tax.rate}%)
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-lg font-semibold">Products/Services</Label>
                  <Button type="button" onClick={addProduct} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Item
                  </Button>
                </div>

                {products.map((product, index) => (
                  <div key={product.id} className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Product/Service Name</Label>
                        <div className="flex gap-2">
                          <Input
                            value={product.name}
                            onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                            placeholder="Enter product name"
                            required
                            className="flex-1"
                          />
                          <Select onValueChange={(value) => {
                            if (value === "custom") {
                              // User wants to add custom product, do nothing special
                              return;
                            }
                            const item = inventory?.find(inv => inv.id === value);
                            if (item) selectInventoryItem(product.id, item);
                          }}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Import from Inventory" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="custom">Add Custom Product</SelectItem>
                              {inventory?.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.product_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">Description</Label>
                        <Textarea
                          value={product.description || ""}
                          onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                          placeholder="Enter description (optional)"
                          className="min-h-[60px]"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                      <div>
                        <Label className="text-sm">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={product.quantity}
                          onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Price (Rs.)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.price}
                          onChange={(e) => updateProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <span className="text-sm font-medium">
                          Total: Rs.{(product.quantity * product.price).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeProduct(product.id)}
                          className="w-full"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Logo Selection */}
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
                                src={`https://ykjtvqztcatrkinzfpov.supabase.co/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`}
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
                                  src={`https://ykjtvqztcatrkinzfpov.supabase.co/storage/v1/object/public/business_files/${logoPath}`}
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
                            src={`https://ykjtvqztcatrkinzfpov.supabase.co/storage/v1/object/public/business_files/${selectedLogo || businessDetails?.business_logo_url}`} 
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

              {/* Signature section */}
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
                          src={`https://ykjtvqztcatrkinzfpov.supabase.co/storage/v1/object/public/business_files/${selectedSignature || profile?.digital_signature_url}`} 
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

              <div className="border-t pt-4">
                <div className="space-y-2 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Rs.{subtotal.toFixed(2)}</span>
                  </div>
                  {selectedTaxes.length > 0 && (
                    <div className="space-y-1">
                      {selectedTaxes.map(taxId => {
                        const tax = taxConfigurations.find(t => t.id === taxId);
                        if (!tax) return null;
                        const taxAmount = subtotal * (tax.rate / 100);
                        return (
                          <div key={taxId} className="flex justify-between text-sm">
                            <span>{tax.name} ({tax.rate}%):</span>
                            <span>Rs.{taxAmount.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>Rs.{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/invoices')}
        >
          View All
        </Button>
      </div>
    </>
  );
}

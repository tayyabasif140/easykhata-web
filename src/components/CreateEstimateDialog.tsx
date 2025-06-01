
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, X, Trash } from "lucide-react";
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
import { SignatureManager } from "./SignatureManager";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description: string;
}

export function CreateEstimateDialog() {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [validUntil, setValidUntil] = useState<Date>();
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<string>('');
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<string>('');
  const [showLogoSelector, setShowLogoSelector] = useState(false);
  const [terms, setTerms] = useState("");
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

  const { data: inventoryProducts } = useQuery({
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
    if (field === 'name' && typeof value === 'string') {
      const inventoryProduct = inventoryProducts?.find(
        p => p.product_name.toLowerCase() === value.toLowerCase()
      );
      
      if (inventoryProduct) {
        setProducts(products.map(p => 
          p.id === id 
            ? { ...p, name: inventoryProduct.product_name, price: inventoryProduct.price, description: inventoryProduct.description || '' }
            : p
        ));
        return;
      }
    }
    
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleCustomerSelect = (selectedCustomerId: string) => {
    setCustomerId(selectedCustomerId);
  };

  const handleSignatureSelect = (signatureUrl: string) => {
    setSelectedSignature(signatureUrl);
    setShowSignatureCanvas(false);
  };

  const handleLogoSelect = (logoUrl: string) => {
    setSelectedLogo(logoUrl);
    setShowLogoSelector(false);
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
      title: "Creating estimate...",
      description: "Your estimate is being generated",
    });

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create estimate
      const { data: estimate, error: estimateError } = await supabase
        .from('estimates')
        .insert([{
          customer_id: customerId,
          total_amount: subtotal,
          tax_amount: totalTax,
          valid_until: validUntil?.toISOString().split('T')[0],
          user_id: userData.user.id,
          status: 'draft'
        }])
        .select()
        .single();

      if (estimateError) {
        console.error('Estimate creation error:', estimateError);
        throw estimateError;
      }

      // Create estimate items
      const estimateItems = products.map(product => ({
        estimate_id: estimate.id,
        product_name: product.name,
        quantity: product.quantity,
        price: product.price,
        total: product.quantity * product.price,
        description: product.description
      }));

      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(estimateItems);

      if (itemsError) {
        console.error('Estimate items creation error:', itemsError);
        throw itemsError;
      }

      toast({
        title: "Success",
        description: "Estimate created successfully!",
      });

      queryClient.invalidateQueries({ queryKey: ['estimates'] });
      setOpen(false);
      
      // Reset form
      setCustomerId("");
      setValidUntil(undefined);
      setProducts([]);
      setSelectedSignature("");
      setSelectedLogo("");
      setTerms("");

    } catch (error: any) {
      console.error('Error creating estimate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create estimate",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 w-full sm:w-auto" data-create-estimate>
          <Plus className="w-4 h-4" />
          Create Estimate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Estimate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={handleCustomerSelect} required>
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
              <div key={product.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-4 border rounded-lg">
                <div className="sm:col-span-3">
                  <Label className="text-sm">Product/Service Name</Label>
                  <Input
                    list={`products-${index}`}
                    value={product.name}
                    onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                    placeholder="Enter product name"
                    required
                  />
                  <datalist id={`products-${index}`}>
                    {inventoryProducts?.map((p) => (
                      <option key={p.id} value={p.product_name} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-sm">Description</Label>
                  <Input
                    value={product.description}
                    onChange={(e) => updateProduct(product.id, 'description', e.target.value)}
                    placeholder="Enter description"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={product.quantity}
                    onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
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
                <div className="sm:col-span-1 flex items-end">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeProduct(product.id)}
                    className="w-full sm:w-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <span className="text-sm font-medium">
                    Rs.{(product.quantity * product.price).toFixed(2)}
                  </span>
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

          {/* Terms */}
          <div className="space-y-2">
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Enter terms and conditions for this estimate"
              rows={3}
            />
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Estimate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

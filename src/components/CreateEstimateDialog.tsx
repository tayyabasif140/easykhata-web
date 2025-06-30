import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CustomerSelector } from "./CustomerSelector";
import { Trash2, Plus } from "lucide-react";
import { generateInvoicePDF } from "@/utils/invoiceTemplates";

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

interface CustomFieldValues {
  [key: string]: string;
}

interface CreateEstimateDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateEstimateDialog({ open, onOpenChange }: CreateEstimateDialogProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([{ id: "1", name: "", quantity: 1, price: 0 }]);
  const [description, setDescription] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValues>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dialogOpen = open !== undefined ? open : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

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
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userData.user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: customFields } = useQuery({
    queryKey: ['customFields'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from('custom_columns')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  const addProduct = () => {
    setProducts([...products, { id: Date.now().toString(), name: "", quantity: 1, price: 0 }]);
  };

  const updateProduct = (id: string, field: string, value: any) => {
    setProducts(
      products.map((product) =>
        product.id === id ? { ...product, [field]: value } : product
      )
    );
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter((product) => product.id !== id));
  };

  const calculateSubtotal = useMemo(() => {
    return products.reduce((acc, product) => acc + product.quantity * product.price, 0);
  }, [products]);

  const calculateTax = useMemo(() => {
    if (!businessDetails?.tax_configuration || businessDetails.tax_configuration.length === 0) return 0;

    let taxAmount = 0;
    businessDetails.tax_configuration.forEach((tax) => {
      if (tax.enabled) {
        taxAmount += calculateSubtotal * (tax.rate / 100);
      }
    });
    return taxAmount;
  }, [calculateSubtotal, businessDetails]);

  const calculateTotal = useMemo(() => {
    return calculateSubtotal + calculateTax;
  }, [calculateSubtotal, calculateTax]);

  const createEstimate = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', selectedCustomer)
        .single();

      if (customerError) throw customerError;

      const { data, error } = await supabase
        .from('estimates')
        .insert([
          {
            user_id: userData.user.id,
            customer_id: selectedCustomer,
            total_amount: calculateTotal,
            tax_amount: calculateTax,
            status: 'draft',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Insert estimate items
      await Promise.all(
        products.map(async (product) => {
          const { error: itemError } = await supabase
            .from('estimate_items')
            .insert([
              {
                estimate_id: data.id,
                product_name: product.name,
                quantity: product.quantity,
                price: product.price,
                total: product.quantity * product.price,
                description: product.description,
              },
            ]);
          if (itemError) throw itemError;
        })
      );

      return { ...data, customer: customerData };
    },
    onSuccess: async (newEstimate) => {
      queryClient.invalidateQueries({ queryKey: ['estimates'] });

      // Generate PDF
      try {
        const pdf = await generateInvoicePDF('classic', {
          customerName: newEstimate.customer.name,
          companyName: businessDetails?.business_name || '',
          phone: newEstimate.customer.phone || '',
          email: newEstimate.customer.email || '',
          products: products.map((product) => ({
            name: product.name,
            quantity: product.quantity,
            price: product.price,
            description: product.description,
          })),
          subtotal: calculateSubtotal,
          tax: calculateTax,
          total: calculateTotal,
          businessDetails: businessDetails,
          profile: profile,
          isEstimate: true,
          customFields: customFields?.reduce((obj: any, field) => {
            obj[field.column_name] = customFieldValues[field.id] || '';
            return obj;
          }, {}),
        });

        const pdfBlob = pdf.output('blob');
        const pdfFile = new File([pdfBlob], `estimate-${newEstimate.id}.pdf`, { type: 'application/pdf' });

        // Upload PDF to Supabase storage
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const filePath = `${userData.user.id}/estimates/${pdfFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('business_files')
          .upload(filePath, pdfFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Update estimate with PDF URL
        const { error: updateError } = await supabase
          .from('estimates')
          .update({ pdf_url: filePath })
          .eq('id', newEstimate.id);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: "Estimate created and PDF generated successfully",
        });
      } catch (pdfError: any) {
        toast({
          title: "Error",
          description: pdfError.message,
          variant: "destructive",
        });
      }

      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEstimate.mutateAsync();
  };

  const DialogComponent = open !== undefined ? Dialog : DialogTrigger;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {open === undefined && (
        <DialogTrigger asChild>
          <Button>Create New Estimate</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Estimate</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="customer">Select Customer</Label>
            <CustomerSelector
              value={selectedCustomer || ""}
              onValueChange={setSelectedCustomer}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Products</h3>
            {products.map((product) => (
              <div key={product.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                <div>
                  <Label htmlFor={`name-${product.id}`}>Name</Label>
                  <Input
                    type="text"
                    id={`name-${product.id}`}
                    value={product.name}
                    onChange={(e) => updateProduct(product.id, "name", e.target.value)}
                    placeholder="Product Name"
                  />
                </div>
                <div>
                  <Label htmlFor={`quantity-${product.id}`}>Quantity</Label>
                  <Input
                    type="number"
                    id={`quantity-${product.id}`}
                    value={product.quantity}
                    onChange={(e) => updateProduct(product.id, "quantity", parseInt(e.target.value))}
                    placeholder="Quantity"
                  />
                </div>
                <div>
                  <Label htmlFor={`price-${product.id}`}>Price</Label>
                  <Input
                    type="number"
                    id={`price-${product.id}`}
                    value={product.price}
                    onChange={(e) => updateProduct(product.id, "price", parseFloat(e.target.value))}
                    placeholder="Price"
                  />
                </div>
                <div>
                  <Label htmlFor={`description-${product.id}`}>Description</Label>
                  <Textarea
                    id={`description-${product.id}`}
                    value={product.description}
                    onChange={(e) => updateProduct(product.id, "description", e.target.value)}
                    placeholder="Description"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeProduct(product.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" onClick={addProduct}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Business Logo & Signature</h3>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <Label htmlFor="businessLogo">Business Logo</Label>
                  {businessDetails?.business_logo_url && (
                    <div className="mt-2">
                      <img
                        src={`https://ykjtvqztcatrkinzfpov.supabase.co/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`}
                        alt="Business Logo"
                        className="h-20 w-auto object-contain border rounded"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="signature">Digital Signature</Label>
                  {profile?.digital_signature_url && (
                    <div className="mt-2">
                      <img
                        src={`https://ykjtvqztcatrkinzfpov.supabase.co/storage/v1/object/public/business_files/${profile.digital_signature_url}`}
                        alt="Digital Signature"
                        className="h-20 w-auto object-contain border rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Custom Fields</h3>
              {customFields?.map((field) => (
                <div key={field.id}>
                  <Label htmlFor={field.id}>{field.column_name}</Label>
                  <Input
                    id={field.id}
                    type={field.column_type === 'number' ? 'number' : 'text'}
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
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            />
          </div>

          <div className="text-right">
            <p className="text-lg font-semibold">Subtotal: Rs.{calculateSubtotal.toFixed(2)}</p>
            <p className="text-lg font-semibold">Tax: Rs.{calculateTax.toFixed(2)}</p>
            <p className="text-2xl font-bold">Total: Rs.{calculateTotal.toFixed(2)}</p>
          </div>

          <Button type="submit" disabled={createEstimate.isPending}>
            {createEstimate.isPending ? "Creating..." : "Create Estimate"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

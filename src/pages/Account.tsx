import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";
import { AdditionalFeaturesSettings } from "@/components/AdditionalFeaturesSettings";

const Account = () => {
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [ntnNumber, setNtnNumber] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [website, setWebsite] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [invoiceTemplate, setInvoiceTemplate] = useState("classic");
  const [taxConfig, setTaxConfig] = useState<any[]>([]);
  const [taxPayments, setTaxPayments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const { data: taxPaymentsData } = useQuery({
    queryKey: ['taxPayments'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];
      const { data, error } = await supabase
        .from('tax_payments')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (businessDetails) {
      setBusinessName(businessDetails.business_name || "");
      setBusinessAddress(businessDetails.business_address || "");
      setNtnNumber(businessDetails.ntn_number || "");
      setBusinessCategory(businessDetails.business_category || "");
      setWebsite(businessDetails.website || "");
      setPrivacyPolicy(businessDetails.privacy_policy || "");
      setInvoiceTemplate(businessDetails.invoice_template || "classic");
      setTaxConfig(businessDetails.tax_configuration || []);
    }
  }, [businessDetails]);

  useEffect(() => {
    if (taxPaymentsData) {
      setTaxPayments(taxPaymentsData);
    }
  }, [taxPaymentsData]);

  const addTaxType = () => {
    const newTax = {
      id: Date.now().toString(),
      name: '',
      rate: 0,
      enabled: true
    };
    setTaxConfig([...taxConfig, newTax]);
  };

  const removeTaxType = (id: string) => {
    setTaxConfig(taxConfig.filter(tax => tax.id !== id));
  };

  const updateTaxType = (id: string, field: string, value: any) => {
    setTaxConfig(taxConfig.map(tax => 
      tax.id === id ? { ...tax, [field]: value } : tax
    ));
  };

  const deleteTaxPayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('tax_payments')
        .delete()
        .eq('id', paymentId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Tax payment deleted successfully"
      });
      
      queryClient.invalidateQueries({ queryKey: ['taxPayments'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('business_details')
        .upsert([
          {
            user_id: userData.user.id,
            business_name: businessName,
            business_address: businessAddress,
            ntn_number: ntnNumber,
            business_category: businessCategory,
            website: website,
            privacy_policy: privacyPolicy,
            invoice_template: invoiceTemplate,
            tax_configuration: taxConfig
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Business settings saved successfully"
      });

      queryClient.invalidateQueries({ queryKey: ['businessDetails'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save business settings",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your business information and preferences</p>
        </div>

        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
            <TabsTrigger value="business">Business Settings</TabsTrigger>
            <TabsTrigger value="additional">Additional Features</TabsTrigger>
            <TabsTrigger value="tax">Tax Management</TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Update your business details that appear on invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessCategory">Business Category</Label>
                      <Input
                        id="businessCategory"
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">Business Address</Label>
                    <Textarea
                      id="businessAddress"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ntnNumber">NTN Number</Label>
                      <Input
                        id="ntnNumber"
                        value={ntnNumber}
                        onChange={(e) => setNtnNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="privacyPolicy">Privacy Policy</Label>
                    <Textarea
                      id="privacyPolicy"
                      value={privacyPolicy}
                      onChange={(e) => setPrivacyPolicy(e.target.value)}
                      rows={4}
                      placeholder="Enter your privacy policy text that will appear on invoices"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiceTemplate">Invoice Template</Label>
                    <select
                      id="invoiceTemplate"
                      value={invoiceTemplate}
                      onChange={(e) => setInvoiceTemplate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="classic">Classic</option>
                      <option value="professional">Professional</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-lg font-semibold">Tax Configuration</Label>
                      <Button type="button" variant="outline" onClick={addTaxType} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Tax Type
                      </Button>
                    </div>

                    {taxConfig.map((tax, index) => (
                      <div key={tax.id} className="flex gap-4 items-end p-4 border rounded-lg">
                        <div className="flex-1">
                          <Label>Tax Name</Label>
                          <Input
                            value={tax.name}
                            onChange={(e) => updateTaxType(tax.id, 'name', e.target.value)}
                            placeholder="e.g., VAT, GST"
                          />
                        </div>
                        <div className="w-32">
                          <Label>Rate (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={tax.rate}
                            onChange={(e) => updateTaxType(tax.id, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={tax.enabled}
                            onChange={(e) => updateTaxType(tax.id, 'enabled', e.target.checked)}
                          />
                          <Label>Enabled</Label>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeTaxType(tax.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Settings"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="additional">
            <Card>
              <CardHeader>
                <CardTitle>Additional Features</CardTitle>
                <CardDescription>
                  Customize your invoices and estimates with additional features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdditionalFeaturesSettings />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Tax Payments</CardTitle>
                <CardDescription>
                  View and manage your tax payment history
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {taxPayments.length > 0 ? (
                    taxPayments.map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <p className="font-semibold">Rs.{payment.amount}</p>
                          <p className="text-sm text-gray-600">{payment.description || 'Tax Payment'}</p>
                          <p className="text-sm text-gray-500">
                            Paid on: {new Date(payment.payment_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteTaxPayment(payment.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No tax payments recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Account;

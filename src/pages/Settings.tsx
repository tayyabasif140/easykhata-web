import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Plus } from "lucide-react";
import { AdditionalFeaturesSettings } from "@/components/AdditionalFeaturesSettings";

const Settings = () => {
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessLogoUrl, setBusinessLogoUrl] = useState("");
  const [invoiceTemplate, setInvoiceTemplate] = useState("classic");
  const [taxConfiguration, setTaxConfiguration] = useState<any[]>([]);
  const [newTaxName, setNewTaxName] = useState("");
  const [newTaxRate, setNewTaxRate] = useState(0);
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
    },
  });

  // Handle business details data when it's loaded
  useEffect(() => {
    if (businessDetails) {
      setBusinessName(businessDetails.business_name || "");
      setBusinessEmail(businessDetails.business_email || "");
      setBusinessPhone(businessDetails.business_phone || "");
      setBusinessAddress(businessDetails.business_address || "");
      setBusinessLogoUrl(businessDetails.business_logo_url || "");
      setInvoiceTemplate(businessDetails.invoice_template || "classic");
      setTaxConfiguration(businessDetails.tax_configuration || []);
    }
  }, [businessDetails]);

  const handleSaveBusinessDetails = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('business_details')
        .upsert([
          {
            user_id: userData.user.id,
            business_name: businessName,
            business_email: businessEmail,
            business_phone: businessPhone,
            business_address: businessAddress,
            business_logo_url: businessLogoUrl,
            invoice_template: invoiceTemplate,
            tax_configuration: taxConfiguration,
          },
        ], { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Business details saved successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['businessDetails'] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const filePath = `${userData.user.id}/logo/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('business_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setBusinessLogoUrl(filePath);
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error: deleteError } = await supabase.storage
        .from('business_files')
        .remove([businessLogoUrl]);

      if (deleteError) throw deleteError;

      setBusinessLogoUrl("");
      toast({
        title: "Success",
        description: "Logo removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddTax = () => {
    if (!newTaxName || newTaxRate <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid tax name and rate",
        variant: "destructive",
      });
      return;
    }

    setTaxConfiguration([
      ...taxConfiguration,
      { name: newTaxName, rate: newTaxRate, enabled: true },
    ]);
    setNewTaxName("");
    setNewTaxRate(0);
  };

  const handleRemoveTax = (index: number) => {
    const newTaxConfig = [...taxConfiguration];
    newTaxConfig.splice(index, 1);
    setTaxConfiguration(newTaxConfig);
  };

  const handleTaxEnableChange = (index: number, enabled: boolean) => {
    const newTaxConfig = [...taxConfiguration];
    newTaxConfig[index] = { ...newTaxConfig[index], enabled };
    setTaxConfiguration(newTaxConfig);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
        
        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="business">Business Settings</TabsTrigger>
            <TabsTrigger value="template">Template Settings</TabsTrigger>
            <TabsTrigger value="tax">Tax Settings</TabsTrigger>
            <TabsTrigger value="additional">Additional Features</TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
                <CardDescription>
                  Update your business information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Business Phone</Label>
                  <Input
                    id="businessPhone"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Textarea
                    id="businessAddress"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessLogo">Business Logo</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      type="file"
                      id="businessLogo"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Label
                      htmlFor="businessLogo"
                      className="cursor-pointer bg-gray-100 hover:bg-gray-200 rounded-md px-4 py-2"
                    >
                      <Upload className="w-4 h-4 mr-2 inline-block" />
                      Upload Logo
                    </Label>
                    {businessLogoUrl && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  {businessLogoUrl && (
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${businessLogoUrl}`}
                      alt="Business Logo"
                      className="mt-2 h-20 w-auto"
                    />
                  )}
                </div>
                <Button onClick={handleSaveBusinessDetails}>Save Details</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="template">
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
                <CardDescription>
                  Customize your invoice template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceTemplate">Invoice Template</Label>
                  <Select
                    value={invoiceTemplate}
                    onValueChange={setInvoiceTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="diamond">Diamond</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveBusinessDetails}>Save Template</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Tax Settings</CardTitle>
                <CardDescription>
                  Configure your tax rates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Add New Tax</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newTaxName">Tax Name</Label>
                      <Input
                        id="newTaxName"
                        value={newTaxName}
                        onChange={(e) => setNewTaxName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="newTaxRate">Tax Rate (%)</Label>
                      <Input
                        id="newTaxRate"
                        type="number"
                        value={newTaxRate}
                        onChange={(e) => setNewTaxRate(parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddTax} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tax
                  </Button>
                </div>

                <div>
                  <h4 className="text-sm font-medium">Existing Taxes</h4>
                  <div className="space-y-2">
                    {taxConfiguration.map((tax, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div>
                          <span>{tax.name}</span>
                          <span className="text-gray-500 ml-2">
                            ({tax.rate}%)
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={tax.enabled}
                            onCheckedChange={(checked) =>
                              handleTaxEnableChange(index, checked)
                            }
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveTax(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSaveBusinessDetails}>Save Tax Configuration</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="additional">
            <AdditionalFeaturesSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;

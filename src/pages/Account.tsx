import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Building, Phone, Mail, Globe, Diamond, Save, Image } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignatureManager } from "@/components/SignatureManager";

export default function Account() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [selectedSignature, setSelectedSignature] = useState<string>('');

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  const { data: businessDetails, isLoading: businessLoading } = useQuery({
    queryKey: ['businessDetails'],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from('business_details')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || { business_name: "", business_address: "", business_category: "", user_id: session.user.id };
    },
    enabled: !!session?.user?.id
  });

  useEffect(() => {
    if (profile?.digital_signature_url) {
      setSelectedSignature(profile.digital_signature_url);
    }

    if (businessDetails?.invoice_template) {
      setSelectedTemplate(businessDetails.invoice_template);
    }
  }, [profile, businessDetails]);

  const selectTemplateByClick = (template: string) => {
    setSelectedTemplate(template);
  };

  const handleSignatureSelect = (signatureUrl: string) => {
    setSelectedSignature(signatureUrl);
  };

  const updateProfile = useMutation({
    mutationFn: async (formData: FormData) => {
      setLoading(true);
      try {
        if (!session?.user?.id) throw new Error("Not authenticated");

        const businessName = formData.get('businessName') || businessDetails?.business_name;
        if (!businessName || businessName.toString().trim() === '') {
          throw new Error("Business name is required");
        }

        const fullName = formData.get('fullName') || profile?.full_name;
        if (!fullName || fullName.toString().trim() === '') {
          throw new Error("Full name is required");
        }

        const username = formData.get('username') || profile?.username;
        if (!username || username.toString().trim() === '') {
          throw new Error("Username is required");
        }

        const email = formData.get('email') || profile?.email;
        if (!email || email.toString().trim() === '') {
          throw new Error("Email is required");
        }

        let businessLogoUrl = businessDetails?.business_logo_url;

        const businessLogo = formData.get('businessLogo') as File;
        if (businessLogo?.size) {
          const filePath = `${session.user.id}/logos/${Date.now()}_${businessLogo.name}`;
          console.log('Uploading business logo:', filePath);
          const { data, error: uploadError } = await supabase.storage
            .from('business_files')
            .upload(filePath, businessLogo, {
              upsert: true
            });
          
          if (uploadError) {
            console.error('Error uploading logo:', uploadError);
            throw uploadError;
          }
          businessLogoUrl = filePath;
          console.log('Logo uploaded successfully:', businessLogoUrl);
        }

        const { count, error: countError } = await supabase
          .from('business_details')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id);
          
        if (countError) throw countError;
        
        if (count === 0) {
          const { error: businessCreateError } = await supabase
            .from('business_details')
            .insert({
              user_id: session.user.id,
              business_name: businessName.toString(),
              business_logo_url: businessLogoUrl,
              business_address: formData.get('businessAddress') as string,
              ntn_number: formData.get('ntnNumber') as string,
              business_category: formData.get('businessCategory') as string,
              website: formData.get('website') as string,
              social_media_links: {
                facebook: formData.get('facebook') as string,
                twitter: formData.get('twitter') as string,
                linkedin: formData.get('linkedin') as string,
              },
              invoice_template: selectedTemplate,
            });

          if (businessCreateError) throw businessCreateError;
        } else {
          const { error: templateError } = await supabase
            .from('business_details')
            .update({
              business_name: businessName.toString(),
              business_logo_url: businessLogoUrl,
              business_address: formData.get('businessAddress') as string || businessDetails?.business_address || '',
              ntn_number: formData.get('ntnNumber') as string || businessDetails?.ntn_number || '',
              business_category: formData.get('businessCategory') as string || businessDetails?.business_category || '',
              website: formData.get('website') as string || businessDetails?.website || '',
              social_media_links: {
                facebook: formData.get('facebook') as string || businessDetails?.social_media_links?.facebook || '',
                twitter: formData.get('twitter') as string || businessDetails?.social_media_links?.twitter || '',
                linkedin: formData.get('linkedin') as string || businessDetails?.social_media_links?.linkedin || '',
              },
              invoice_template: selectedTemplate,
            })
            .eq('user_id', session.user.id);

          if (templateError) throw templateError;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName.toString(),
            username: username.toString(),
            email: email.toString(),
            phone_number: formData.get('phoneNumber') as string || profile?.phone_number || '',
          })
          .eq('id', session.user.id);

        if (profileError) throw profileError;

        toast({
          title: "Success",
          description: "Your profile has been updated successfully.",
        });

        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['businessDetails'] });
      } catch (error: any) {
        console.error('Profile update error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  });

  if (profileLoading || businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8 text-primary" />
              My Account
            </h1>
            <p className="text-gray-600 mt-1">Manage your personal and business information</p>
          </div>
          
          <Tabs defaultValue="business" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="business" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Business
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Diamond className="h-4 w-4" />
                Invoice Templates
              </TabsTrigger>
            </TabsList>
            
            <form 
              className="space-y-8"
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                if (!formData.get('businessName') && businessDetails?.business_name) {
                  formData.append('businessName', businessDetails.business_name);
                }
                
                if (!formData.get('fullName') && profile?.full_name) {
                  formData.append('fullName', profile.full_name);
                }
                
                if (!formData.get('username') && profile?.username) {
                  formData.append('username', profile.username);
                }
                
                if (!formData.get('email') && profile?.email) {
                  formData.append('email', profile.email);
                }
                
                updateProfile.mutate(formData);
              }}
            >
              <input type="hidden" name="businessName" value={businessDetails?.business_name || ""} />
              <input type="hidden" name="fullName" value={profile?.full_name || ""} />
              <input type="hidden" name="username" value={profile?.username || ""} />
              <input type="hidden" name="email" value={profile?.email || ""} />
              
              <TabsContent value="business">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5 text-primary" />
                      Business Details
                    </CardTitle>
                    <CardDescription>
                      Update your business information that will appear on your invoices
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="businessName" className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          Business Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="businessName"
                          name="businessName"
                          defaultValue={businessDetails?.business_name || ""}
                          className="border-gray-300"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="businessCategory" className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          Business Category
                        </Label>
                        <Input
                          id="businessCategory"
                          name="businessCategory"
                          defaultValue={businessDetails?.business_category || ""}
                          className="border-gray-300"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessLogo" className="flex items-center gap-1">
                        <Image className="h-4 w-4" />
                        Business Logo
                      </Label>
                      {businessDetails?.business_logo_url && (
                        <div className="mb-4">
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`}
                            alt="Business Logo"
                            className="h-24 w-auto object-contain rounded-lg border p-2"
                          />
                        </div>
                      )}
                      <Input
                        id="businessLogo"
                        name="businessLogo"
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        className="border-gray-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessAddress" className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        Business Address
                      </Label>
                      <Input
                        id="businessAddress"
                        name="businessAddress"
                        defaultValue={businessDetails?.business_address || ""}
                        className="border-gray-300"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="ntnNumber" className="flex items-center gap-1">
                          <FileSignature className="h-4 w-4" />
                          NTN Number
                        </Label>
                        <Input
                          id="ntnNumber"
                          name="ntnNumber"
                          defaultValue={businessDetails?.ntn_number || ""}
                          className="border-gray-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website" className="flex items-center gap-1">
                          <Globe className="h-4 w-4" />
                          Website
                        </Label>
                        <Input
                          id="website"
                          name="website"
                          defaultValue={businessDetails?.website || ""}
                          className="border-gray-300"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Social Media Links</CardTitle>
                    <CardDescription>
                      Share your social media profiles with your customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="facebook">Facebook</Label>
                        <Input
                          id="facebook"
                          name="facebook"
                          defaultValue={businessDetails?.social_media_links?.facebook || ""}
                          className="border-gray-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twitter">Twitter</Label>
                        <Input
                          id="twitter"
                          name="twitter"
                          defaultValue={businessDetails?.social_media_links?.twitter || ""}
                          className="border-gray-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedin">LinkedIn</Label>
                        <Input
                          id="linkedin"
                          name="linkedin"
                          defaultValue={businessDetails?.social_media_links?.linkedin || ""}
                          className="border-gray-300"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>
                      Update your personal information for your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          Full Name
                        </Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          defaultValue={profile?.full_name}
                          className="border-gray-300"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="username" className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          Username
                        </Label>
                        <Input
                          id="username"
                          name="username"
                          defaultValue={profile?.username}
                          className="border-gray-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phoneNumber" className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          Phone Number
                        </Label>
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          defaultValue={profile?.phone_number || ""}
                          className="border-gray-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={profile?.email}
                          className="border-gray-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Image className="h-4 w-4" />
                        Digital Signature
                      </Label>
                      
                      {session?.user?.id && (
                        <SignatureManager
                          userId={session.user.id}
                          onSignatureSelect={handleSignatureSelect}
                          defaultSignature={profile?.digital_signature_url}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="templates">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Diamond className="h-5 w-5 text-primary" />
                      Invoice Templates
                    </CardTitle>
                    <CardDescription>
                      Choose a template to use for your invoices
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Label>Selected Template</Label>
                      <Select 
                        value={selectedTemplate} 
                        onValueChange={setSelectedTemplate}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modern">Modern</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="diamond">Diamond</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedTemplate === 'modern' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}
                        onClick={() => selectTemplateByClick('modern')}
                      >
                        <div className="aspect-[8.5/11] bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                          <div className="w-[80%] h-[90%] p-4 bg-white shadow-sm flex flex-col">
                            <div className="border-b pb-2 mb-4">
                              <div className="w-20 h-8 bg-gray-200 rounded mb-4"></div>
                              <div className="flex justify-between">
                                <div className="w-32 h-4 bg-gray-200 rounded"></div>
                                <div className="w-24 h-4 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                        </div>
                        <h3 className="font-medium text-center">Modern</h3>
                      </div>

                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedTemplate === 'professional' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}
                        onClick={() => selectTemplateByClick('professional')}
                      >
                        <div className="aspect-[8.5/11] bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                          <div className="w-[80%] h-[90%] p-4 bg-white shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                              <div className="w-24 h-10 bg-blue-200 rounded"></div>
                              <div>
                                <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
                                <div className="w-24 h-4 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="w-full h-4 bg-blue-100 rounded mb-4"></div>
                              <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                            </div>
                          </div>
                        </div>
                        <h3 className="font-medium text-center">Professional</h3>
                      </div>

                      <div 
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedTemplate === 'diamond' ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}
                        onClick={() => selectTemplateByClick('diamond')}
                      >
                        <div className="aspect-[8.5/11] bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                          <div className="w-[80%] h-[90%] p-4 bg-gradient-to-br from-white to-gray-50 shadow-sm flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                              <div className="w-28 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg"></div>
                              <div>
                                <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
                                <div className="w-24 h-4 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                            <div className="w-full h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 my-4"></div>
                            <div className="flex-1">
                              <div className="w-full h-4 bg-blue-50 rounded mb-4"></div>
                              <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="w-full h-4 bg-gray-200 rounded mb-2"></div>
                              <div className="w-full h-16 bg-gray-100 rounded-lg mt-4 p-2">
                                <div className="flex justify-between">
                                  <div className="w-20 h-4 bg-blue-100 rounded"></div>
                                  <div className="w-20 h-4 bg-blue-200 rounded"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <h3 className="font-medium text-center">Diamond</h3>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <div className="mt-8">
                <Button type="submit" disabled={loading} className="w-full flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

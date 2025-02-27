
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { templates, InvoiceData } from "@/utils/invoiceTemplates";
import { jsPDF } from "jspdf";

export default function Settings() {
  const queryClient = useQueryClient();
  const [previewTemplate, setPreviewTemplate] = useState<string>("classic");
  const [showPreview, setShowPreview] = useState(false);

  const {
    data: profile,
    error,
    isLoading
  } = useQuery({
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

  const ProfileCard = ({ profile }: { profile: any }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState(profile);
    
    const updateProfile = useMutation({
      mutationFn: async (updates: any) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');
        
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userData.user.id);
        
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        setIsEditing(false);
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully."
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
      }
    });
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      updateProfile.mutate(formData);
    };
    
    if (isEditing) {
      return (
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input 
                id="fullName" 
                value={formData.full_name || ''}
                onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={formData.phone_number || ''}
                onChange={e => setFormData({...formData, phone_number: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm font-medium">Full Name</p>
            <p className="text-sm text-gray-500">{profile.full_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Phone</p>
            <p className="text-sm text-gray-500">{profile.phone_number || 'Not provided'}</p>
          </div>
        </div>
        <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
      </div>
    );
  };

  const {
    data: businessDetails,
    error: businessError,
    refetch: refetchBusinessDetails
  } = useQuery({
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

  const updateBusinessDetails = useMutation({
    mutationFn: async (updates: any) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { error } = await supabase
        .from('business_details')
        .update(updates)
        .eq('user_id', userData.user.id);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      refetchBusinessDetails();
      toast({
        title: "Success",
        description: "Business details updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update business details",
        variant: "destructive",
      });
    }
  });

  const handleUpdateBusinessDetails = (updates: any) => {
    updateBusinessDetails.mutate(updates);
  };

  const handlePreviewInvoice = async () => {
    try {
      // Sample invoice data for preview
      const sampleData: InvoiceData = {
        customerName: "Sample Customer",
        companyName: "Sample Company Ltd.",
        phone: "+1 234 567 890",
        email: "customer@example.com",
        products: [
          { name: "Product 1", quantity: 2, price: 100 },
          { name: "Product 2", quantity: 1, price: 200 },
        ],
        subtotal: 400,
        tax: 40,
        total: 440,
        dueDate: new Date(),
        businessDetails: businessDetails,
        profile: profile
      };

      // Get template function
      const templateFn = templates[previewTemplate as keyof typeof templates];
      if (!templateFn) {
        throw new Error("Template not found");
      }

      // Generate PDF
      const doc = await templateFn(sampleData);
      
      // Convert to data URL for preview
      const pdfDataUrl = doc.output('dataurlstring');
      
      // Open preview in new window
      const previewWindow = window.open();
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head>
              <title>Invoice Preview - ${previewTemplate} Template</title>
              <style>
                body { margin: 0; padding: 0; }
                iframe { width: 100%; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${pdfDataUrl}"></iframe>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
      toast({
        title: "Error",
        description: "Failed to generate invoice preview",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto py-10 pt-24">
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="templates">Invoice Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Manage your personal information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile && <ProfileCard profile={profile} />}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
                <CardDescription>
                  Manage your business information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input
                      value={businessDetails?.business_name || ''}
                      onChange={(e) => handleUpdateBusinessDetails({ business_name: e.target.value })}
                      placeholder="Enter your business name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business Address</Label>
                    <Input
                      value={businessDetails?.business_address || ''}
                      onChange={(e) => handleUpdateBusinessDetails({ business_address: e.target.value })}
                      placeholder="Enter your business address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Terms and Conditions</Label>
                    <Textarea
                      className="min-h-[200px]"
                      value={businessDetails?.terms_and_conditions || ''}
                      onChange={(e) => handleUpdateBusinessDetails({ terms_and_conditions: e.target.value })}
                      placeholder="Enter your business terms and conditions"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Templates</CardTitle>
                <CardDescription>
                  Choose and preview your invoice templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Classic Template */}
                  <div className={`border rounded-lg p-4 ${previewTemplate === 'classic' ? 'ring-2 ring-primary' : ''}`}>
                    <div className="h-40 bg-gray-100 flex items-center justify-center mb-4">
                      <div className="p-4 w-full">
                        <div className="h-6 bg-gray-400 w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-300 w-full mb-1"></div>
                        <div className="h-4 bg-gray-300 w-2/3"></div>
                        <div className="mt-4 h-5 bg-gray-400 w-full"></div>
                        <div className="mt-2 h-3 bg-gray-300 w-full"></div>
                      </div>
                    </div>
                    <h3 className="font-medium">Classic</h3>
                    <p className="text-sm text-gray-500 mb-4">Simple, traditional invoice layout</p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('classic');
                          handlePreviewInvoice();
                        }}
                      >
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('classic');
                          handleUpdateBusinessDetails({ invoice_template: 'classic' });
                        }}
                      >
                        {businessDetails?.invoice_template === 'classic' ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Modern Template */}
                  <div className={`border rounded-lg p-4 ${previewTemplate === 'modern' ? 'ring-2 ring-primary' : ''}`}>
                    <div className="h-40 bg-gray-800 flex items-center justify-center mb-4">
                      <div className="p-4 w-full">
                        <div className="h-6 bg-white w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-400 w-1/2 mb-1"></div>
                        <div className="h-4 bg-gray-400 w-1/3"></div>
                        <div className="mt-4 h-5 bg-white w-full"></div>
                        <div className="mt-2 h-3 bg-gray-400 w-3/4"></div>
                      </div>
                    </div>
                    <h3 className="font-medium">Modern</h3>
                    <p className="text-sm text-gray-500 mb-4">Contemporary, minimalist design</p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('modern');
                          handlePreviewInvoice();
                        }}
                      >
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('modern');
                          handleUpdateBusinessDetails({ invoice_template: 'modern' });
                        }}
                      >
                        {businessDetails?.invoice_template === 'modern' ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Professional Template */}
                  <div className={`border rounded-lg p-4 ${previewTemplate === 'professional' ? 'ring-2 ring-primary' : ''}`}>
                    <div className="h-40 bg-blue-50 flex items-center justify-center mb-4">
                      <div className="p-4 w-full">
                        <div className="flex justify-between mb-2">
                          <div className="h-8 bg-blue-200 w-1/4"></div>
                          <div className="h-8 bg-blue-800 w-1/4"></div>
                        </div>
                        <div className="h-4 bg-blue-100 w-1/2 mb-1"></div>
                        <div className="mt-4 h-5 bg-blue-800 w-full"></div>
                        <div className="mt-2 h-3 bg-blue-200 w-full"></div>
                      </div>
                    </div>
                    <h3 className="font-medium">Professional</h3>
                    <p className="text-sm text-gray-500 mb-4">Business-focused, professional design</p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('professional');
                          handlePreviewInvoice();
                        }}
                      >
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('professional');
                          handleUpdateBusinessDetails({ invoice_template: 'professional' });
                        }}
                      >
                        {businessDetails?.invoice_template === 'professional' ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Diamond Template */}
                  <div className={`border rounded-lg p-4 ${previewTemplate === 'diamond' ? 'ring-2 ring-primary' : ''}`}>
                    <div className="h-40 bg-gray-900 flex items-center justify-center mb-4">
                      <div className="p-4 w-full">
                        <div className="h-6 bg-white w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-400 w-1/3 mb-1"></div>
                        <div className="mt-4 h-5 bg-gray-200 w-full"></div>
                        <div className="mt-2 h-4 bg-gray-300 w-full"></div>
                        <div className="mt-2 h-4 bg-gray-100 w-1/4 ml-auto"></div>
                      </div>
                    </div>
                    <h3 className="font-medium">Diamond</h3>
                    <p className="text-sm text-gray-500 mb-4">Luxury design for premium businesses</p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('diamond');
                          handlePreviewInvoice();
                        }}
                      >
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('diamond');
                          handleUpdateBusinessDetails({ invoice_template: 'diamond' });
                        }}
                      >
                        {businessDetails?.invoice_template === 'diamond' ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Golden Template */}
                  <div className={`border rounded-lg p-4 ${previewTemplate === 'golden' ? 'ring-2 ring-primary' : ''}`}>
                    <div className="h-40 bg-amber-50 flex items-center justify-center mb-4">
                      <div className="p-4 w-full">
                        <div className="h-6 bg-amber-600 w-1/2 mb-2"></div>
                        <div className="h-4 bg-amber-200 w-2/3 mb-1"></div>
                        <div className="mt-4 h-5 bg-amber-400 w-full"></div>
                        <div className="mt-2 h-3 bg-amber-300 w-3/4"></div>
                      </div>
                    </div>
                    <h3 className="font-medium">Golden</h3>
                    <p className="text-sm text-gray-500 mb-4">Elegant, premium design with gold accents</p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('golden');
                          handlePreviewInvoice();
                        }}
                      >
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('golden');
                          handleUpdateBusinessDetails({ invoice_template: 'golden' });
                        }}
                      >
                        {businessDetails?.invoice_template === 'golden' ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Bold Template */}
                  <div className={`border rounded-lg p-4 ${previewTemplate === 'bold' ? 'ring-2 ring-primary' : ''}`}>
                    <div className="h-40 bg-black flex items-center justify-center mb-4">
                      <div className="p-4 w-full">
                        <div className="h-8 bg-white w-1/3 mb-2"></div>
                        <div className="h-4 bg-gray-400 w-1/2 mb-1"></div>
                        <div className="mt-4 h-6 bg-white w-full"></div>
                        <div className="mt-2 h-4 bg-gray-200 w-1/2"></div>
                      </div>
                    </div>
                    <h3 className="font-medium">Bold</h3>
                    <p className="text-sm text-gray-500 mb-4">Strong, high-contrast design</p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('bold');
                          handlePreviewInvoice();
                        }}
                      >
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('bold');
                          handleUpdateBusinessDetails({ invoice_template: 'bold' });
                        }}
                      >
                        {businessDetails?.invoice_template === 'bold' ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Funky Template */}
                  <div className={`border rounded-lg p-4 ${previewTemplate === 'funky' ? 'ring-2 ring-primary' : ''}`}>
                    <div className="h-40 bg-pink-500 flex items-center justify-center mb-4">
                      <div className="p-4 w-full">
                        <div className="h-6 bg-yellow-300 w-1/2 mb-2"></div>
                        <div className="h-4 bg-blue-400 w-2/3 mb-1"></div>
                        <div className="mt-4 h-5 bg-green-400 w-full"></div>
                        <div className="mt-2 h-3 bg-purple-400 w-3/4"></div>
                      </div>
                    </div>
                    <h3 className="font-medium">Funky</h3>
                    <p className="text-sm text-gray-500 mb-4">Colorful, vibrant design for creative businesses</p>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('funky');
                          handlePreviewInvoice();
                        }}
                      >
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setPreviewTemplate('funky');
                          handleUpdateBusinessDetails({ invoice_template: 'funky' });
                        }}
                      >
                        {businessDetails?.invoice_template === 'funky' ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

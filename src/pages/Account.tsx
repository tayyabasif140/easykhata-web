
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BackButton } from "@/components/BackButton";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignatureManager } from "@/components/SignatureManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Account() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [digitalSignature, setDigitalSignature] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const { toast } = useToast();

  useEffect(() => {
    getProfile();
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      let { data, error, status } = await supabase
        .from("profiles")
        .select(`full_name, username, email, digital_signature_url`)
        .eq("id", userData.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      // Get business details to fetch selected template
      const { data: businessData, error: businessError } = await supabase
        .from("business_details")
        .select("invoice_template")
        .eq("user_id", userData.user.id)
        .single();

      if (businessError && businessError.code !== 'PGRST116') {
        console.error("Error fetching business details:", businessError);
      } else if (businessData) {
        setSelectedTemplate(businessData.invoice_template || "classic");
      }

      if (data) {
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setEmail(data.email || "");
        setDigitalSignature(data.digital_signature_url || "");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile({
    username,
    fullName,
  }: {
    username: string;
    fullName: string;
  }) {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const updates = {
        id: userData.user.id,
        full_name: fullName,
        username,
        updated_at: new Date(),
      };

      let { error } = await supabase.from("profiles").upsert(updates, {
        onConflict: 'id'
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      
      getProfile();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateBusinessTemplate(template: string) {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from("business_details")
        .update({ invoice_template: template })
        .eq("user_id", userData.user.id);

      if (error) {
        throw error;
      }

      setSelectedTemplate(template);
      
      toast({
        title: "Success",
        description: "Invoice template updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <BackButton className="mb-4" />
        <div className="space-y-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="business">Business Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="bg-white shadow-md rounded-md p-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="Avatar" />
                    ) : (
                      <AvatarFallback>{fullName?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h2 className="text-lg font-semibold">Profile Information</h2>
                    <p className="text-gray-500">Update your personal details here.</p>
                  </div>
                </div>
                <div className="mt-6">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateProfile({
                        username,
                        fullName,
                      });
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        readOnly
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" disabled={loading} className="w-full">
                        {loading ? "Updating ..." : "Update Profile"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="business">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Template</CardTitle>
                    <CardDescription>Choose your default invoice template</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div 
                        className={`border rounded-md p-4 cursor-pointer ${selectedTemplate === 'classic' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                        onClick={() => updateBusinessTemplate('classic')}
                      >
                        <div className="h-32 bg-gray-100 mb-2 flex items-center justify-center">
                          <span className="text-gray-500">Classic Template</span>
                        </div>
                        <p className="font-medium">Classic</p>
                        <p className="text-sm text-gray-500">Simple and clean design</p>
                      </div>
                      <div 
                        className={`border rounded-md p-4 cursor-pointer ${selectedTemplate === 'professional' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                        onClick={() => updateBusinessTemplate('professional')}
                      >
                        <div className="h-32 bg-gray-100 mb-2 flex items-center justify-center">
                          <span className="text-gray-500">Professional Template</span>
                        </div>
                        <p className="font-medium">Professional</p>
                        <p className="text-sm text-gray-500">Modern business design</p>
                      </div>
                      <div 
                        className={`border rounded-md p-4 cursor-pointer ${selectedTemplate === 'diamond' ? 'border-primary ring-2 ring-primary/20' : ''}`}
                        onClick={() => updateBusinessTemplate('diamond')}
                      >
                        <div className="h-32 bg-gray-100 mb-2 flex items-center justify-center">
                          <span className="text-gray-500">Diamond Template</span>
                        </div>
                        <p className="font-medium">Diamond</p>
                        <p className="text-sm text-gray-500">Premium elegant design</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Digital Signature</CardTitle>
                    <CardDescription>Add or update your digital signature</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!loading && (
                      <SignatureManager 
                        userId={supabase.auth.getUser().then(res => res.data.user?.id || '')} 
                        onSignatureSelect={setDigitalSignature} 
                        defaultSignature={digitalSignature}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="bg-white shadow-md rounded-md p-6">
            <h2 className="text-lg font-semibold">Account Actions</h2>
            <p className="text-gray-500 mt-1">Manage your account settings.</p>
            <div className="mt-6">
              <Button onClick={signOut} variant="destructive" className="w-full">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

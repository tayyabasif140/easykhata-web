
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
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload } from "lucide-react";

export default function Account() {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [digitalSignature, setDigitalSignature] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [userId, setUserId] = useState("");
  const [privacyPolicy, setPrivacyPolicy] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getProfile();
  }, []);

  // Update avatar preview URL when avatarUrl changes
  useEffect(() => {
    if (avatarUrl) {
      // Create the public URL for preview
      const previewUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${avatarUrl}`;
      setAvatarPreviewUrl(previewUrl);
    }
  }, [avatarUrl]);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      // Set the userId state
      setUserId(userData.user.id);
      
      // Get the email from auth
      setEmail(userData.user.email || "");

      let { data, error, status } = await supabase
        .from("profiles")
        .select(`full_name, username, avatar_url, digital_signature_url`)
        .eq("id", userData.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      // Get business details to fetch selected template and privacy policy
      const { data: businessData, error: businessError } = await supabase
        .from("business_details")
        .select("invoice_template, privacy_policy")
        .eq("user_id", userData.user.id)
        .single();

      if (businessError && businessError.code !== 'PGRST116') {
        console.error("Error fetching business details:", businessError);
      } else if (businessData) {
        setSelectedTemplate(businessData.invoice_template || "classic");
        setPrivacyPolicy(businessData.privacy_policy || "");
      }

      if (data) {
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setAvatarUrl(data.avatar_url || "");
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

  async function updatePrivacyPolicy() {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Check if business details already exist
      const { data, error: checkError } = await supabase
        .from("business_details")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      // Insert or update privacy policy
      if (data) {
        // Update existing record
        const { error } = await supabase
          .from("business_details")
          .update({ privacy_policy: privacyPolicy })
          .eq("user_id", userData.user.id);
        
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("business_details")
          .insert({ 
            user_id: userData.user.id, 
            privacy_policy: privacyPolicy,
            invoice_template: selectedTemplate
          });
        
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Privacy policy updated successfully!",
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

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      
      if (!e.target.files || e.target.files.length === 0) {
        return;
      }
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/avatar/${fileName}`;
      
      console.log("Uploading avatar to path:", filePath);
      
      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from('business_files')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: filePath,
          updated_at: new Date()
        })
        .eq('id', userId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Get the public URL for preview
      const { data } = supabase.storage
        .from('business_files')
        .getPublicUrl(filePath);
      
      console.log("Avatar uploaded, public URL:", data.publicUrl);
      
      setAvatarUrl(filePath);
      setAvatarPreviewUrl(data.publicUrl);
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
                  <div className="relative">
                    <Avatar className="w-20 h-20">
                      {avatarPreviewUrl ? (
                        <AvatarImage 
                          src={avatarPreviewUrl} 
                          alt="Avatar" 
                        />
                      ) : (
                        <AvatarFallback>{fullName?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                      )}
                    </Avatar>
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 cursor-pointer"
                      title="Upload profile picture"
                    >
                      <Camera className="w-4 h-4" />
                      <input 
                        id="avatar-upload" 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={uploadAvatar}
                        disabled={uploading}
                      />
                    </label>
                  </div>
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
                    {!loading && userId && (
                      <SignatureManager 
                        userId={userId} 
                        onSignatureSelect={setDigitalSignature} 
                        defaultSignature={digitalSignature}
                      />
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy Policy</CardTitle>
                    <CardDescription>Add your business privacy policy to include on invoices</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Textarea 
                        placeholder="Enter your privacy policy here..." 
                        value={privacyPolicy}
                        onChange={(e) => setPrivacyPolicy(e.target.value)}
                        className="min-h-[200px]"
                      />
                      <Button onClick={updatePrivacyPolicy} disabled={loading}>
                        {loading ? "Saving..." : "Save Privacy Policy"}
                      </Button>
                    </div>
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

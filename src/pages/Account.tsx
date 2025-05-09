
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase, getPublicImageUrl } from "@/integrations/supabase/client";
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
import { Camera, Upload, ImageIcon, X } from "lucide-react";
import { validateImageUrl, handleImageFileUpload } from "@/utils/templates/classic/utils/images";

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
  const [googleProfilePic, setGoogleProfilePic] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    getProfile();
  }, []);

  useEffect(() => {
    async function validateAvatar() {
      if (avatarUrl) {
        setImageLoading(true);
        setImageError(false);
        
        try {
          const url = avatarUrl.startsWith('http') ? avatarUrl : getPublicImageUrl(avatarUrl) || "";
          console.log("Setting avatar preview URL to:", url);
          setAvatarPreviewUrl(url);
          
          if (url) {
            const isValid = await validateImageUrl(url);
            setImageError(!isValid);
            if (!isValid) {
              console.error("Avatar URL is invalid:", url);
            }
          } else {
            setImageError(true);
            console.error("No valid URL found for avatar");
          }
        } catch (error) {
          console.error("Error validating avatar:", error);
          setImageError(true);
        } finally {
          setImageLoading(false);
        }
      }
    }
    
    validateAvatar();
  }, [avatarUrl]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      handleFileUploadHelper(e.dataTransfer.files[0]);
    }
  }, []);

  async function getProfile() {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      
      setUserId(userData.user.id);
      setEmail(userData.user.email || "");
      
      if (userData.user.app_metadata?.avatar_url) {
        setGoogleProfilePic(userData.user.app_metadata.avatar_url);
      }

      let { data, error, status } = await supabase
        .from("profiles")
        .select(`full_name, username, avatar_url, digital_signature_url`)
        .eq("id", userData.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      const { data: businessData, error: businessError } = await supabase
        .from("business_details")
        .select("invoice_template, privacy_policy, business_logo_url")
        .eq("user_id", userData.user.id)
        .single();

      if (businessError && businessError.code !== 'PGRST116') {
        console.error("Error fetching business details:", businessError);
      } else if (businessData) {
        console.log("Business data retrieved:", businessData);
        setSelectedTemplate(businessData.invoice_template || "classic");
        setPrivacyPolicy(businessData.privacy_policy || "");
        
        if (businessData.business_logo_url) {
          console.log("Business logo URL found:", businessData.business_logo_url);
        } else {
          console.log("No business logo URL found in database");
        }
      }

      if (data) {
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        
        if (googleProfilePic && !data.avatar_url) {
          setAvatarUrl(googleProfilePic);
        } else {
          setAvatarUrl(data.avatar_url || "");
        }
        
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
        email: email, // Include email to prevent the not-null constraint violation
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

      const { data, error: checkError } = await supabase
        .from("business_details")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (data) {
        const { error } = await supabase
          .from("business_details")
          .update({ privacy_policy: privacyPolicy })
          .eq("user_id", userData.user.id);
        
        if (error) throw error;
      } else {
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

  async function handleFileUploadHelper(file: File) {
    try {
      setUploading(true);
      setImageError(false);
      
      if (!file) {
        return;
      }
      
      console.log("Processing file upload:", file.name, file.type, file.size);
      
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error("You need to be logged in to upload images");
      }
      
      const result = await handleImageFileUpload(file, userId, 'avatar');
      
      if (!result) {
        throw new Error("Failed to upload image");
      }
      
      console.log("Image uploaded successfully:", result);
      
      setAvatarUrl(result.path);
      setAvatarPreviewUrl(result.publicUrl);
      
      toast({
        title: "Success",
        description: "Profile picture and business logo updated successfully!",
      });
      
      setTimeout(() => {
        getProfile();
        window.dispatchEvent(new CustomEvent('profile-image-updated'));
      }, 1000);
      
    } catch (error: any) {
      console.error("Upload error:", error);
      setImageError(true);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    handleFileUploadHelper(file);
  }

  async function setGoogleProfilePicAsAvatar() {
    if (!googleProfilePic) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: googleProfilePic,
          updated_at: new Date()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      setAvatarUrl(googleProfilePic);
      setAvatarPreviewUrl(googleProfilePic);
      
      toast({
        title: "Success",
        description: "Profile picture updated with Google avatar!",
      });
      
      window.dispatchEvent(new CustomEvent('profile-image-updated'));
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
                  <div 
                    className="relative" 
                    ref={dropZoneRef}
                    onDragEnter={handleDragIn}
                    onDragOver={handleDrag}
                    onDragLeave={handleDragOut}
                    onDrop={handleDrop}
                  >
                    <div 
                      className={`w-20 h-20 rounded-full relative overflow-hidden transition-all duration-200 ${
                        isDragging ? 'ring-4 ring-primary border-dashed border-2 scale-110' : ''
                      }`}
                    >
                      <Avatar className="w-20 h-20">
                        {!imageLoading && avatarPreviewUrl && !imageError ? (
                          <AvatarImage 
                            src={avatarPreviewUrl} 
                            alt="Avatar" 
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <AvatarFallback className="bg-primary/10">
                            {imageLoading ? (
                              <div className="animate-pulse flex items-center justify-center w-full h-full">
                                <div className="w-10 h-10 bg-primary/30 rounded-full"></div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-full h-full">
                                {imageError ? (
                                  <ImageIcon className="w-8 h-8 text-primary/70" />
                                ) : (
                                  <span className="text-xl font-semibold">{fullName?.charAt(0).toUpperCase() || '?'}</span>
                                )}
                              </div>
                            )}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      {isDragging && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Upload className="w-8 h-8 text-primary" />
                        </div>
                      )}
                    </div>

                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1 cursor-pointer shadow-md hover:bg-primary/90 transition-colors"
                      title="Upload profile picture"
                    >
                      <Camera className="w-4 h-4" />
                      <input 
                        id="avatar-upload" 
                        type="file" 
                        accept="image/png,image/jpeg,image/jpg" 
                        className="hidden" 
                        onChange={uploadAvatar}
                        disabled={uploading}
                        ref={fileInputRef}
                      />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Profile Information</h2>
                    <p className="text-gray-500">Update your personal details here.</p>
                    <p className="text-sm text-primary mt-1">
                      <strong>Drag & drop</strong> a PNG or JPG image or click the camera icon
                    </p>
                    {googleProfilePic && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2" 
                        onClick={setGoogleProfilePicAsAvatar}
                      >
                        Use Google Profile Picture
                      </Button>
                    )}
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

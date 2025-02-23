
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Account() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
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
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id
  });

  const updateProfile = useMutation({
    mutationFn: async (formData: FormData) => {
      setLoading(true);
      try {
        if (!session?.user?.id) throw new Error("Not authenticated");

        let businessLogoUrl = businessDetails?.business_logo_url;
        let digitalSignatureUrl = profile?.digital_signature_url;

        // Handle business logo upload
        const businessLogo = formData.get('businessLogo') as File;
        if (businessLogo?.size) {
          const filePath = `${session.user.id}/logos/${businessLogo.name}`;
          const { data, error: uploadError } = await supabase.storage
            .from('business_files')
            .upload(filePath, businessLogo);
          
          if (uploadError) throw uploadError;
          businessLogoUrl = data.path;
        }

        // Handle digital signature upload
        const digitalSignature = formData.get('digitalSignature') as File;
        if (digitalSignature?.size) {
          const filePath = `${session.user.id}/signatures/${digitalSignature.name}`;
          const { data, error: uploadError } = await supabase.storage
            .from('business_files')
            .upload(filePath, digitalSignature);
          
          if (uploadError) throw uploadError;
          digitalSignatureUrl = data.path;
        }

        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.get('fullName'),
            username: formData.get('username'),
            phone_number: formData.get('phoneNumber'),
            email: formData.get('email'),
            digital_signature_url: digitalSignatureUrl,
          })
          .eq('id', session.user.id);

        if (profileError) throw profileError;

        // Update business details
        const { error: businessError } = await supabase
          .from('business_details')
          .update({
            business_name: formData.get('businessName'),
            business_logo_url: businessLogoUrl,
            business_address: formData.get('businessAddress'),
            ntn_number: formData.get('ntnNumber'),
            business_category: formData.get('businessCategory'),
            website: formData.get('website'),
            social_media_links: {
              facebook: formData.get('facebook'),
              twitter: formData.get('twitter'),
              linkedin: formData.get('linkedin'),
            },
          })
          .eq('user_id', session.user.id);

        if (businessError) throw businessError;

        toast({
          title: "Success",
          description: "Your profile has been updated successfully.",
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['businessDetails'] });
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
  });

  if (profileLoading || businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>
        
        <form 
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate(new FormData(e.currentTarget));
          }}
        >
          {/* Business Details Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Business Details</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  defaultValue={businessDetails?.business_name}
                  required
                />
              </div>

              <div>
                <Label htmlFor="businessLogo">Business Logo</Label>
                {businessDetails?.business_logo_url && (
                  <div className="mb-2">
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${businessDetails.business_logo_url}`}
                      alt="Business Logo"
                      className="h-20 w-20 object-cover rounded-lg"
                    />
                  </div>
                )}
                <Input
                  id="businessLogo"
                  name="businessLogo"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                />
              </div>

              <div>
                <Label htmlFor="businessAddress">Business Address</Label>
                <Input
                  id="businessAddress"
                  name="businessAddress"
                  defaultValue={businessDetails?.business_address || ""}
                />
              </div>

              <div>
                <Label htmlFor="ntnNumber">NTN Number</Label>
                <Input
                  id="ntnNumber"
                  name="ntnNumber"
                  defaultValue={businessDetails?.ntn_number || ""}
                />
              </div>

              <div>
                <Label htmlFor="businessCategory">Business Category</Label>
                <Input
                  id="businessCategory"
                  name="businessCategory"
                  defaultValue={businessDetails?.business_category || ""}
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  defaultValue={businessDetails?.website || ""}
                />
              </div>
            </div>
          </div>

          {/* Personal Information Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={profile?.full_name}
                  required
                />
              </div>

              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={profile?.username}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  defaultValue={profile?.phone_number || ""}
                />
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={profile?.email}
                  required
                />
              </div>

              <div>
                <Label htmlFor="digitalSignature">Digital Signature</Label>
                {profile?.digital_signature_url && (
                  <div className="mb-2">
                    <img
                      src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${profile.digital_signature_url}`}
                      alt="Digital Signature"
                      className="h-20 w-auto object-contain rounded-lg"
                    />
                  </div>
                )}
                <Input
                  id="digitalSignature"
                  name="digitalSignature"
                  type="file"
                  accept=".png"
                />
              </div>
            </div>
          </div>

          {/* Social Media Links Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Social Media Links</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  name="facebook"
                  defaultValue={businessDetails?.social_media_links?.facebook || ""}
                />
              </div>

              <div>
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  name="twitter"
                  defaultValue={businessDetails?.social_media_links?.twitter || ""}
                />
              </div>

              <div>
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  name="linkedin"
                  defaultValue={businessDetails?.social_media_links?.linkedin || ""}
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

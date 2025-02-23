
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const ALLOWED_FILE_TYPES = ["image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const SetupWizard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Business Details
    businessName: "",
    businessLogo: null as File | null,
    businessAddress: "",
    ntnNumber: "",
    
    // Personal Information
    fullName: "",
    username: "",
    phoneNumber: "",
    email: "",
    digitalSignature: null as File | null,
    
    // Additional Details
    businessCategory: "",
    website: "",
    socialMediaLinks: {
      facebook: "",
      twitter: "",
      linkedin: "",
    },
  });

  const handleFileUpload = async (file: File, path: string) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error("Invalid file type. Please upload PNG or JPG images only.");
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File size should be less than 5MB.");
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Not authenticated");

    const filePath = `${userData.user.id}/${path}/${file.name}`;
    const { data, error } = await supabase.storage
      .from("business_files")
      .upload(filePath, file);

    if (error) throw error;

    return data.path;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Upload files
      let businessLogoUrl = null;
      let digitalSignatureUrl = null;

      if (formData.businessLogo) {
        businessLogoUrl = await handleFileUpload(formData.businessLogo, "logos");
      }
      if (formData.digitalSignature) {
        digitalSignatureUrl = await handleFileUpload(formData.digitalSignature, "signatures");
      }

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: userData.user.id,
          full_name: formData.fullName,
          username: formData.username,
          phone_number: formData.phoneNumber,
          email: formData.email,
          digital_signature_url: digitalSignatureUrl,
        });

      if (profileError) throw profileError;

      // Create business details
      const { error: businessError } = await supabase
        .from("business_details")
        .insert({
          user_id: userData.user.id,
          business_name: formData.businessName,
          business_logo_url: businessLogoUrl,
          business_address: formData.businessAddress,
          ntn_number: formData.ntnNumber,
          business_category: formData.businessCategory,
          website: formData.website,
          social_media_links: formData.socialMediaLinks,
        });

      if (businessError) throw businessError;

      toast({
        title: "Welcome to EasyKhata!",
        description: "Your account has been set up successfully.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "businessLogo" | "digitalSignature"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, [field]: file }));
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Business Details</h2>
      
      <div>
        <Label htmlFor="businessName">Business Name</Label>
        <Input
          id="businessName"
          value={formData.businessName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, businessName: e.target.value }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="businessLogo">Business Logo</Label>
        <Input
          id="businessLogo"
          type="file"
          accept=".png,.jpg,.jpeg"
          onChange={(e) => handleFileChange(e, "businessLogo")}
        />
        <p className="text-sm text-gray-500 mt-1">
          Upload PNG/JPG format, max 5MB
        </p>
      </div>

      <div>
        <Label htmlFor="businessAddress">Business Address</Label>
        <Input
          id="businessAddress"
          value={formData.businessAddress}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, businessAddress: e.target.value }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="ntnNumber">NTN (National Tax Number)</Label>
        <Input
          id="ntnNumber"
          value={formData.ntnNumber}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, ntnNumber: e.target.value }))
          }
          required
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
      
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, fullName: e.target.value }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, username: e.target.value }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="phoneNumber">Phone Number</Label>
        <Input
          id="phoneNumber"
          value={formData.phoneNumber}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="digitalSignature">Digital Signature</Label>
        <Input
          id="digitalSignature"
          type="file"
          accept=".png"
          onChange={(e) => handleFileChange(e, "digitalSignature")}
        />
        <p className="text-sm text-gray-500 mt-1">Upload PNG format, max 5MB</p>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Additional Details</h2>
      
      <div>
        <Label htmlFor="businessCategory">Business Category</Label>
        <Input
          id="businessCategory"
          value={formData.businessCategory}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, businessCategory: e.target.value }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="website">Website (Optional)</Label>
        <Input
          id="website"
          value={formData.website}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, website: e.target.value }))
          }
        />
      </div>

      <div>
        <Label>Social Media Links (Optional)</Label>
        <div className="space-y-2">
          <Input
            placeholder="Facebook URL"
            value={formData.socialMediaLinks.facebook}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                socialMediaLinks: {
                  ...prev.socialMediaLinks,
                  facebook: e.target.value,
                },
              }))
            }
          />
          <Input
            placeholder="Twitter URL"
            value={formData.socialMediaLinks.twitter}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                socialMediaLinks: {
                  ...prev.socialMediaLinks,
                  twitter: e.target.value,
                },
              }))
            }
          />
          <Input
            placeholder="LinkedIn URL"
            value={formData.socialMediaLinks.linkedin}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                socialMediaLinks: {
                  ...prev.socialMediaLinks,
                  linkedin: e.target.value,
                },
              }))
            }
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-center mb-8">
          Complete Your Profile
        </h1>

        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-1/3 h-2 rounded-full mx-1 ${
                  index <= step ? "bg-primary" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="flex justify-between mt-8">
          {step > 1 && (
            <Button onClick={() => setStep((prev) => prev - 1)}>Previous</Button>
          )}
          {step < 3 ? (
            <Button
              className="ml-auto"
              onClick={() => setStep((prev) => prev + 1)}
            >
              Next
            </Button>
          ) : (
            <Button
              className="ml-auto"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;


import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SignatureManagerProps {
  userId: string;
  onSignatureSelect: (signatureUrl: string) => void;
  defaultSignature?: string | null;
}

export function SignatureManager({ userId, onSignatureSelect, defaultSignature }: SignatureManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSignature, setCurrentSignature] = useState<string | null>(defaultSignature || null);
  const [isUploading, setIsUploading] = useState(false);

  const updateProfileSignature = useMutation({
    mutationFn: async (signatureUrl: string | null) => {
      const { error } = await supabase
        .from('profiles')
        .update({ digital_signature_url: signatureUrl })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const filePath = `${userId}/signature/${Date.now()}-${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('business_files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Update profile with new signature URL
      await updateProfileSignature.mutateAsync(filePath);
      
      setCurrentSignature(filePath);
      onSignatureSelect(filePath);
      
      toast({
        title: "Success",
        description: "Digital signature uploaded successfully",
      });
    } catch (error: any) {
      console.error("Signature upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload signature",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveSignature = async () => {
    if (!currentSignature) return;

    try {
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('business_files')
        .remove([currentSignature]);

      if (deleteError) {
        console.error("Delete error:", deleteError);
      }

      // Update profile
      await updateProfileSignature.mutateAsync(null);
      
      setCurrentSignature(null);
      onSignatureSelect('');
      
      toast({
        title: "Success",
        description: "Digital signature removed successfully",
      });
    } catch (error: any) {
      console.error("Remove signature error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove signature",
        variant: "destructive",
      });
    }
  };

  const signatureUrl = currentSignature 
    ? `https://ykjtvqztcatrkinzfpov.supabase.co/storage/v1/object/public/business_files/${currentSignature}`
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          id="signature-upload"
          accept="image/*"
          onChange={handleSignatureUpload}
          className="hidden"
          disabled={isUploading}
        />
        <Label
          htmlFor="signature-upload"
          className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {isUploading ? "Uploading..." : "Upload Signature"}
        </Label>
        
        {currentSignature && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveSignature}
            disabled={isUploading}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </Button>
        )}
      </div>
      
      {signatureUrl && (
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-2">Current signature:</p>
          <img
            src={signatureUrl}
            alt="Digital Signature"
            className="max-h-24 w-auto border rounded"
          />
        </div>
      )}
    </div>
  );
}

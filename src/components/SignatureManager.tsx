
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Brush, Image, Trash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SignatureManagerProps {
  userId: string;
  onSignatureSelect: (signatureUrl: string) => void;
  defaultSignature?: string;
}

export function SignatureManager({ userId, onSignatureSelect, defaultSignature }: SignatureManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signatureMode, setSignatureMode] = useState<'upload' | 'draw'>('upload');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureDataURL, setSignatureDataURL] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [signatureName, setSignatureName] = useState<string>("My Signature");

  // Fetch all user signatures
  const { data: signatures, isLoading } = useQuery({
    queryKey: ['signatures', userId],
    queryFn: async () => {
      try {
        // First check if session is valid
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            toast({
              title: "Session expired",
              description: "Please sign in again to continue.",
              variant: "destructive",
            });
            throw new Error("Authentication required");
          }
        }
        
        // Then fetch signatures
        const { data, error } = await supabase.storage
          .from('business_files')
          .list(`${userId}/signatures`, {
            sortBy: { column: 'name', order: 'desc' }
          });
        
        if (error) throw error;
        return data || [];
      } catch (error: any) {
        console.error("Error fetching signatures:", error);
        toast({
          title: "Error loading signatures",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
    },
    enabled: !!userId
  });

  useEffect(() => {
    if (defaultSignature && canvasRef.current) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setSignatureDataURL(canvas.toDataURL('image/png'));
          }
        }
      };
      img.src = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${defaultSignature}`;
    }
  }, [defaultSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    
    let clientX, clientY;
    
    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let clientX, clientY;
    
    if ('touches' in e) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault(); // Prevent scrolling while drawing
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataURL(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataURL(null);
  };

  const saveSignature = async () => {
    try {
      setIsUploading(true);
      const canvas = canvasRef.current;
      if (!canvas || !signatureDataURL) return;
      
      // Check for valid session first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log("Session expired, attempting to refresh...");
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw new Error("Your session has expired. Please sign in again.");
        }
      }
      
      // Convert canvas to blob
      const fetchResponse = await fetch(signatureDataURL);
      const blob = await fetchResponse.blob();
      
      // Format name to be URL-safe
      const safeName = signatureName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
      const filePath = `${userId}/signatures/${safeName}-${Date.now()}.png`;
      console.log('Uploading drawn signature:', filePath);
      
      const { data, error: uploadError } = await supabase.storage
        .from('business_files')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Update profile with new signature
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ digital_signature_url: filePath })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Success",
        description: "Signature saved successfully!",
      });
      
      // Select the newly saved signature
      onSignatureSelect(filePath);
      
      // Reset canvas and name
      clearCanvas();
      setSignatureMode('upload');
      setSignatureName("My Signature");
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['signatures', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      console.error('Error saving signature:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const selectSignature = async (signaturePath: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ digital_signature_url: signaturePath })
        .eq('id', userId);
      
      if (error) throw error;
      
      onSignatureSelect(signaturePath);
      
      toast({
        title: "Success",
        description: "Signature selected successfully!",
      });
      
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      console.error('Error selecting signature:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteSignature = async (signaturePath: string) => {
    try {
      const { error: deleteError } = await supabase.storage
        .from('business_files')
        .remove([signaturePath]);
      
      if (deleteError) throw deleteError;

      // If deleting the currently selected signature, update profile
      if (defaultSignature === signaturePath) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ digital_signature_url: null })
          .eq('id', userId);
        
        if (updateError) throw updateError;
        
        onSignatureSelect('');
      }
      
      toast({
        title: "Success",
        description: "Signature deleted successfully!",
      });
      
      queryClient.invalidateQueries({ queryKey: ['signatures', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      console.error('Error deleting signature:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUploadSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      // Check for valid session first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log("Session expired, attempting to refresh...");
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw new Error("Your session has expired. Please sign in again.");
        }
      }
      
      const file = e.target.files[0];
      // Format name to be URL-safe
      const safeName = signatureName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
      const filePath = `${userId}/signatures/${safeName}-${Date.now()}.png`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('business_files')
        .upload(filePath, file, {
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Update profile with new signature
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ digital_signature_url: filePath })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Success",
        description: "Signature uploaded successfully!",
      });
      
      // Select the newly uploaded signature
      onSignatureSelect(filePath);
      
      // Reset name
      setSignatureName("My Signature");
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['signatures', userId] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error: any) {
      console.error('Error uploading signature:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  function getSignatureNameFromPath(path: string): string {
    try {
      const filename = path.split('/').pop() || '';
      // Remove timestamp and extension
      let name = filename.split('-')[0];
      // Convert dashes back to spaces and capitalize words
      return name.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    } catch (e) {
      return "Signature";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-4">
        <Button 
          type="button" 
          variant={signatureMode === 'upload' ? 'default' : 'outline'} 
          onClick={() => setSignatureMode('upload')}
          className="flex items-center gap-2"
        >
          <Image className="h-4 w-4" />
          Upload Signature
        </Button>
        <Button 
          type="button" 
          variant={signatureMode === 'draw' ? 'default' : 'outline'} 
          onClick={() => setSignatureMode('draw')}
          className="flex items-center gap-2"
        >
          <Brush className="h-4 w-4" />
          Draw Signature
        </Button>
      </div>

      {signatureMode === 'upload' ? (
        <div>
          <div className="mb-4 space-y-2">
            <Label htmlFor="signatureName">Signature Name</Label>
            <Input
              id="signatureName"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Enter a name for your signature"
              className="w-full"
            />
          </div>
          <div className="mb-4">
            <input
              id="digitalSignature"
              name="digitalSignature"
              type="file"
              accept=".png,.jpg,.jpeg"
              className="border border-gray-300 rounded p-2 w-full"
              onChange={handleUploadSignature}
              disabled={isUploading}
            />
          </div>
          
          {signatures && signatures.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium">Your Signatures</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {signatures.filter(sig => sig.name.includes('signature')).map((signature) => {
                  const signaturePath = `${userId}/signatures/${signature.name}`;
                  const isSelected = defaultSignature === signaturePath;
                  
                  return (
                    <div 
                      key={signature.id} 
                      className={`border rounded-lg p-4 ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}
                    >
                      <div className="font-medium mb-1">{getSignatureNameFromPath(signature.name)}</div>
                      <div className="relative mb-2 bg-white">
                        <img
                          src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business_files/${signaturePath}?t=${Date.now()}`}
                          alt={`Signature ${getSignatureNameFromPath(signature.name)}`}
                          className="h-20 w-auto object-contain"
                        />
                      </div>
                      <div className="flex justify-between">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => selectSignature(signaturePath)}
                          disabled={isSelected || isUploading}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteSignature(signaturePath)}
                          disabled={isUploading}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="drawSignatureName">Signature Name</Label>
            <Input
              id="drawSignatureName"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              placeholder="Enter a name for your signature"
              className="w-full"
            />
          </div>
          <div className="border rounded-lg p-2 bg-white">
            <canvas
              ref={canvasRef}
              width={400}
              height={200}
              className="border rounded touch-none cursor-crosshair w-full"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={clearCanvas}
              className="flex items-center gap-2"
              disabled={isUploading}
            >
              Clear Signature
            </Button>
            <Button 
              type="button" 
              onClick={saveSignature}
              disabled={!signatureDataURL || isUploading}
            >
              {isUploading ? 'Saving...' : 'Save Signature'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

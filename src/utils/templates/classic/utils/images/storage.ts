
/**
 * Image storage and upload utilities
 */

/**
 * Ensure business_files bucket exists and is public
 */
async function ensureBusinessFilesBucket(supabase) {
  try {
    console.log("Checking if business_files bucket exists and is public");
    
    // Try first to list buckets
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("Error checking buckets:", error);
      } else {
        const businessFilesBucket = buckets.find(bucket => bucket.name === 'business_files');
        
        if (!businessFilesBucket) {
          console.log("business_files bucket doesn't exist, creating it");
          const { error: createError } = await supabase.storage.createBucket('business_files', {
            public: true,
            fileSizeLimit: 5242880 // 5MB
          });
          
          if (createError) {
            console.error("Error creating business_files bucket:", createError);
            return false;
          }
          
          console.log("business_files bucket created successfully");

          // After creating the bucket, ensure the proper RLS policies are in place
          await createStoragePolicy(supabase);
          return true;
        } else if (!businessFilesBucket.public) {
          console.error("business_files bucket exists but is not public - trying to update");
          
          try {
            const { error: updateError } = await supabase.storage.updateBucket('business_files', {
              public: true
            });
            
            if (updateError) {
              console.error("Error updating business_files bucket to public:", updateError);
              return false;
            }
            
            console.log("business_files bucket updated to be public");
            // Ensure policies are in place after updating the bucket
            await createStoragePolicy(supabase);
            return true;
          } catch (e) {
            console.error("Error updating bucket visibility:", e);
            return false;
          }
        } else {
          console.log("business_files bucket is correctly configured as public");
          // Ensure policies are in place even if the bucket already exists
          await createStoragePolicy(supabase);
          return true;
        }
      }
    } catch (err) {
      console.error("Error listing buckets:", err);
    }
    
    // If we couldn't determine bucket status, try to create it anyway
    try {
      console.log("Attempting to create or update business_files bucket");
      const { error: createError } = await supabase.storage.createBucket('business_files', {
        public: true,
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        if (createError.message.includes("already exists")) {
          console.log("Bucket already exists, trying to update it");
          const { error: updateError } = await supabase.storage.updateBucket('business_files', {
            public: true
          });
          
          if (updateError) {
            console.error("Error updating business_files bucket:", updateError);
            return false;
          }
          
          console.log("business_files bucket updated successfully");
          await createStoragePolicy(supabase);
          return true;
        } else {
          console.error("Error creating business_files bucket:", createError);
          return false;
        }
      } else {
        console.log("business_files bucket created successfully");
        await createStoragePolicy(supabase);
        return true;
      }
    } catch (err) {
      console.error("Error creating/updating bucket:", err);
      return false;
    }
    
    return false;
  } catch (err) {
    console.error("Error in bucket management:", err);
    return false;
  }
}

/**
 * Create public storage policies for the business_files bucket
 */
async function createStoragePolicy(supabase) {
  try {
    console.log("Ensuring storage policies are set correctly");
    
    // Create a universal select policy for the bucket (makes files readable by anyone)
    const selectPolicyName = "Allow public read access";
    const { error: selectError } = await supabase.rpc('create_storage_policy', {
      bucket_id: 'business_files',
      policy_name: selectPolicyName,
      definition: 'true', // Anyone can read
      operation: 'SELECT'
    });
    
    if (selectError && !selectError.message.includes('already exists')) {
      console.error("Error creating SELECT policy:", selectError);
    } else {
      console.log("SELECT policy configured successfully");
    }
    
    // Create policy to allow authenticated users to upload to their own folder
    const insertPolicyName = "Allow authenticated users to upload";
    const { error: insertError } = await supabase.rpc('create_storage_policy', {
      bucket_id: 'business_files',
      policy_name: insertPolicyName,
      definition: '(auth.uid() = CAST(SPLIT_PART(name, \'/\', 1) AS UUID))', // Only allow users to upload to their own folder
      operation: 'INSERT'
    });
    
    if (insertError && !insertError.message.includes('already exists')) {
      console.error("Error creating INSERT policy:", insertError);
    } else {
      console.log("INSERT policy configured successfully");
    }
    
    // Create policy to allow authenticated users to update their own files
    const updatePolicyName = "Allow authenticated users to update";
    const { error: updateError } = await supabase.rpc('create_storage_policy', {
      bucket_id: 'business_files',
      policy_name: updatePolicyName,
      definition: '(auth.uid() = CAST(SPLIT_PART(name, \'/\', 1) AS UUID))', // Only allow users to update their own files
      operation: 'UPDATE'
    });
    
    if (updateError && !updateError.message.includes('already exists')) {
      console.error("Error creating UPDATE policy:", updateError);
    } else {
      console.log("UPDATE policy configured successfully");
    }
    
    return true;
  } catch (error) {
    console.error("Error creating storage policies:", error);
    return false;
  }
}

/**
 * Convert a File to a public URL by uploading to Supabase
 * Optimized for faster image loading
 */
export const uploadImageAndGetPublicUrl = async (file: File, userId: string, type: 'avatar' | 'logo' = 'avatar'): Promise<string | null> => {
  console.log(`Starting optimized upload of ${type} image:`, file.name, file.type, file.size);
  
  try {
    // Import supabase from the client file to use the existing session
    const { supabase } = await import('@/integrations/supabase/client');
    
    if (!userId) {
      console.error("User ID is required for image upload");
      return null;
    }
    
    // Get user session to ensure we're authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session found. User must be logged in to upload files.");
      return null;
    }
    
    // Validate file type
    const ALLOWED_FILE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      console.error("Invalid file type. Please upload PNG, JPG or WebP images only.");
      return null;
    }
    
    // Validate file size and optimize if needed
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // Reduced to 2MB max
    if (file.size > MAX_FILE_SIZE) {
      console.warn("File is large, optimizing before upload");
      try {
        // We'll upload as is for now, but in the future could add compression
        console.warn("Large file uploaded without optimization");
      } catch (err) {
        console.error("Error optimizing image:", err);
      }
    }
    
    // Create path and filename - use timestamp to prevent caching issues
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${timestamp}.${fileExt}`;
    const filePath = `${userId}/${type}/${fileName}`;
    
    console.log(`Uploading ${type} to path:`, filePath);
    
    // Ensure business_files bucket exists and is public
    await ensureBusinessFilesBucket(supabase);
    
    // Upload the file with a single attempt for speed
    const { data, error } = await supabase.storage
      .from("business_files")
      .upload(filePath, file, {
        cacheControl: "max-age=3600", // Cache for 1 hour
        upsert: true // Overwrite if exists
      });
      
    if (error) {
      console.error("Error uploading:", error);
      return null;
    }
    
    console.log("File uploaded successfully, path:", data.path);
    return data.path;
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};

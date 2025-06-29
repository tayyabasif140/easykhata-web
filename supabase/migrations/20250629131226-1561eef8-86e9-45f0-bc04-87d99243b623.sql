
-- Fix the profiles table to include the phone column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Fix the business_details table to include the business_email column  
ALTER TABLE public.business_details ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE public.business_details ADD COLUMN IF NOT EXISTS business_phone TEXT;

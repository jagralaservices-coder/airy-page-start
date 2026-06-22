-- Create phone_verifications table for OTP tracking
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_created_at ON public.phone_verifications(created_at);

-- Update customers (merchants) table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customers_phone_key'
    ) THEN
        ALTER TABLE public.customers ADD CONSTRAINT customers_phone_key UNIQUE (phone);
    END IF;
END $$;

-- Update stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stores_phone_key'
    ) THEN
        ALTER TABLE public.stores ADD CONSTRAINT stores_phone_key UNIQUE (phone);
    END IF;
END $$;
